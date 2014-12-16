"""
Utilities to access path and file permissions for the server
Copyright 2014 by Fred Moolekamp
License: MIT
"""
from __future__ import print_function, division
import os
import importlib
from collections import OrderedDict

from toyz.utils import core
from toyz.utils import db as db_utils
from toyz.utils.errors import ToyzError

def split_path(path_in):
    """
    Split a path into a list of its folders
    """
    path = core.normalize_path(path_in)
    drive, path = os.path.splitdrive(path)
    folders = []
    while True:
        path, folder = os.path.split(path)
        if folder != '':
            folders.append(folder)
        else:
            if path != '':
                folders.append(path)
            break
    folders.reverse()
    return folders

def get_all_parents(path):
    """
    Create a list with all of the parent directories of the file or path
    """
    path = core.normalize_path(path)
    parent = os.path.dirname(path)
    last_parent = None
    parents = []
    while parent != last_parent:
        parents.append(parent)
        last_parent = parent
        parent = os.path.dirname(parent)
    print('path:{0}, parents:{1}'.format(path, parents))
    return parents

def get_path_tree(path):
    """
    Get all of the sub directories of path
    """
    path = core.normalize_path(path)
    tree = []
    for path, dirs, files in os.walk(path):
        tree.append(path)
    return tree

def get_roots(db_module, user):
    """
    Get the root path for each tree in the users directory structure. This is useful since not
    all of the users available paths may have a common directory.
    """
    pass

def get_file_permissions(db_settings, path, **user):
    """
    Get all of the permissions for a given path
    
    Parameters
    ----------
    db_settings: object
        - Database settings
    path: string
        - Path to check for permissions
    user: dict
        - Key is either 'user_id' or 'group_id', value is the user_id or group_id
    """
    permissions = None
    path_info = db_utils.get_path_info(db_settings, path)
    #print("path_info for {0}'".format(path), path_info)
    if path_info is not None:
        # Find permissions for the user or group (if there are any)
        if 'user_id' in user:
            # If permissions are set explicitely for a user, user those permissions
            # Otherwise check for the most stringent group permissions
            if user['user_id'] in path_info['users']:
                permissions = path_info['users'][user['user_id']]
            else:
                # Combine all group permissions to take the most permissive
                # permissions of the combined groups
                groups = db_utils.get_param(db_settings, 'groups', **user)
                group_permissions = ''.join([p for g,p in path_info['groups'] if g in groups])
                if '*' in path_info['users']:
                    all_permissions = path_info['users']['*']
                else:
                    all_permissions = ''
                permissions = ''.join(set(group_permissions+all_permissions))
        else:
            if user['group_id'] in path_info['groups']:
                permissions = path_info['groups'][user['group_id']]
    
    return permissions

def get_parent_permissions(db_settings, path, **user):
    """
    Find the permissions of the given path. If it doesn't have any permissions
    explicitely set, descend a tree and find the first parent directory with permissions set.
    
    Parameters
    ----------
    db_settings: object
        - Database settings
    path: string
        - Path to begin search for permissions
    user: dict
        - Key is either 'user_id' or 'group_id', value is the user_id or group_id
    """
    parents = get_all_parents(path)
    # Sometimes the `path` will really be a path and filename, so the first parent is
    # the actual path. This makes sure that we always check for the path as well as 
    # its parents.
    if parents[0] != path:
        parents.insert(0,path)
    for parent in parents:
        permissions = get_file_permissions(db_settings, parent, **user)
        if permissions != None:
            #print('permissions for {0}: {1}'.format(path,permissions))
            return permissions
    print('No permissions for {0}'.format(path))
    return None

def format_path(path_info, user):
    """
    When saving permissions for a path, creating and modify any required entries.
    
    Parameters
    ----------
    path_info: dict
        - Permissions for a path
        - Every path should have an `owner`, a dictionary of `users`, and a recursive flag.
        - If `recursive` is set to True, all child directories will be given the
        same permissions
        - Each users dict should have a '*' entry, which represents all users.
    user: ToyzUser
    
    Returns
    -------
    path_info: dict
        - Modified path_info with default included for any missing fields
    """
    if 'owner' not in path_info:
        path_info['owner'] = user.user_id
    if 'users' not in path_info:
        path_info['users'] = {}
    path_info['users'][path_info['owner']] = 'frwx'
    if '*' not in path_info['users']:
        path_info['users']['*'] = ''
    if 'recursive' not in path_info:
        path_info['recursive'] = False
    # Make sure no invalid keys are contained in the path entry
    if not all((key in ('owner', 'groups', 'users', 'recursive') for key in path_info)):
        raise ToyzError("Invalid key in path")
    return path_info

def update_file_permissions(db_settings, user, paths):
    """
    Create or modify the permissions of a file or path. Only the admin or owner of a folder can
    change these. If a user is creating permissions for a new folder, that user must have
    execute permissions ('x') to the parent directory the path is being created in. If a user
    has r, w, or x access he/she will automatically have f access, even if it is not explicitely given.
    By default, permissions are not recursive (child directories do not inherit permissions).
    
    Parameters
    ----------
    db_settings: object
        - Database settings
    user: object
        - Toyz user
    paths: dict of dicts
        - The keys of the top level dictionary are the paths
        - Each path has a dictionary with 1 mandatory and two optional keys:
            * users: dict
                - permissions for the folder
                - Each key is a user, with values for that users permisions
                -Notes:
                    * '*' represents all users, and defaults to '' (no permissions)
                    * The admin account has 'frwx' permissions for all paths unless explicitely forbidden
            * groups: dict
                - Same as users but contains group permissions
            * owner: string, optional
                - owner of the folder
                - defaults to the user supplied above
            * recursive: boolean, optional
                - whether or not the children of the folder will inherit permissions
                - defaults to True
        - Example:
            paths = {
                '~/toyz/folder1': {
                    'users': {
                        '*': 'fr',          # all unspecified users can find and read files from the path 
                        'usr1': 'frwx       # usr1 has full access to the path
                    },
                    'recursive': True       # all sub-directories will be set to the same permissions
                },
                '~/toyz/folder1/secret.txt': {
                    'users': {
                        '*': '',            # all unspecified users have no access to the file
                        'admin': ''         # even the admin user has no access to this file
                    },
                    'groups': {
                        'trusted': 'fr'     # all members of this group can find and read the file
                    }
                    'owner': 'usr2'         # usr2 will automatically have full access
                }
            }
    Returns
    -------
    invalid_paths: list
        - Paths that either don't exist, or the user doesn't have permission to change permissions.
        There is no distinction between the two to prevent a user from attempting to guess someone
        else's tree
    """
    new_paths = OrderedDict()
    update_paths = OrderedDict()
    invalid_paths = {}
    db_module = importlib.import_module(db_settings.interface_name)
    
    # Check whether a path entry has been created and that user has permissions to create/modify them
    for path in paths:
        if not os.path.isdir(path):
            invalid_paths[path] = paths[path]
        else:
            # Descend tree to check if there are any restrictions on a parent directory.
            # This prevents a user from searching another users directory for a path
            # whose permissions may not have been explicitely set
            permissions = get_parent_permissions(db_settings, user, path)
            paths[path] = format_path(paths[path], user)
            if paths[path]['recursive']:
                tree = get_path_tree(path)
                tree = OrderedDict(((t, paths[path]) for t in tree))
            else:
                tree = OrderedDict(((path, paths[path]),))
        
            if permissions is None:
                new_paths.update(tree)
            else:
                if 'x' in permissions:
                    for tpath in tree:
                        for user in tpath:
                            if get_file_permissions(db_settings, user, path) is None:
                                new_paths.update(tree)
                            else:
                                update_paths.update(tree)
                else:
                    invalid_paths[path] = paths[path]
    
    if len(new_paths)>0:
        # Add an entry in the paths table
        db_module.insert_rows(
            db_settings=db_settings,
            user=user,
            table_name='paths',
            columns = ('path', 'owner'),
            rows = [(path, new_paths[path]['owner']) for path in new_paths]
        )
        
        path_ids = db_module.get_path_ids(db_settings, user, new_paths)
        # Create an entry in the user_paths table
        user_paths = [(u, path_ids[path], permissions) 
            for path, path_info in new_paths.items()
                for u, permissions in path_info['users'].items()]
        db_module.insert_rows(
            db_settings=db_settings,
            user=user,
            table_name='user_paths',
            columns = ('user_id', 'path_id', 'permissions'),
            rows = user_paths
        )
        
        # Create an entry in the group_paths table
        if 'groups' in  path_info:
            group_paths = [(group, path_ids[path], permissions) 
                for group, permissions in path_info['groups'].items()
                    for path, path_info in new_paths.items()]
            db_module.insert_rows(
                db_settings=db_settings,
                user=user,
                table_name='paths',
                columns = ('group_id', 'path_id', 'permissions'),
                rows = group_paths
            )
    
    if len(update_paths)>0:
        db_module.update_path_info(db_settings, user, update_paths)
    
    return invalid_paths