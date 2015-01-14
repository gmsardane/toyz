// API for highcharts
// Copyright 2014 by Fred Moolekamp
// License: MIT
Toyz.namespace('Toyz.API.Highcharts');

// Check to see if all of the API's dependencies have loaded
Toyz.API.Highcharts.dependencies_loaded = function(){
    try {
        var h = Highcharts;
        return true;
    } catch(e){
        return false;
    }
};
Toyz.API.Highcharts.load_dependencies = function(callback, params){
    // Check to see if highcharts loaded from the server, if not load from the web
    // Note: Highcharts has put a usage limit on its js files, so it is a good
    // idea to have the source code located on the server
    //console.log('callback in api load_dependencies', callback);
    if(!Toyz.API.Highcharts.dependencies_loaded()){
        console.log('Loading Highcharts');
        $.ajax({
            type: 'GET',
            url: "/third_party/highcharts/highcharts.js",
            dataType: 'script',
            error: function(XMLHttpRequest, status, err){
                console.log("Highcharts not found on server "
                            + "loading Highcharts from external web site");
                $.ajax({
                    type: 'GET',
                    url: "https://code.highcharts.com/highcharts.js",
                    dataType: 'script',
                    error: function(){
                        alert('Unable to load highcharts from server or code.highcharts.com');
                    },
                    success: function(){
                        console.log('Highcharts successfully loaded from code.highcharts.com')
                        callback();
                    }.bind(null,callback)
                })
            }.bind(null,callback),
            success: function(){
                console.log('Highcharts loaded successfully');
                callback();
            }.bind(null,callback)
        })
    };
};

Toyz.API.Highcharts.contextMenu_items = function(workspace, tile_contents){
    var items = $.extend(true,{
        remove: {name:"Remove selected points", callback: function(key, options){
            this.remove_points();
        }.bind(tile_contents)},
        high_sep: "--------------",
    }, Toyz.Workspace.tile_contextMenu_items(workspace));
    return items;
};

Toyz.API.Highcharts.Gui = function(params){
    this.$div = $('<div/>');
    this.$parent = params.$parent;
    this.$parent.append(this.$div);
    this.workspace = params.workspace;
    this.tile = params.tile;
    var gui = {
        type: 'div',
        params: {
            title: {
                lbl:'Title',
                prop: {
                    value: 'Plot'
                }
            },
            subtitle: {lbl: 'Subtitle'},
            selection: {
                lbl: 'Selection type',
                type: 'select',
                options: {
                    'selection': 'select points',
                    'xy': 'xy zoom',
                    'x': 'x zoom',
                    'y': 'y zoom',
                }
            },
            series_div: {
                type: 'div',
                legend: 'Series',
                params: {
                    series: {
                        type: 'list',
                        format: 'none',
                        items: [],
                        newItem: {
                            type: 'div',
                            init: function(new_item){
                                this.update_columns();
                            }.bind(this),
                            params: {
                                chart_type: {
                                    type: 'select',
                                    options: ['scatter', 'line', 'spline', 'area', 'areaspline', 
                                                'bar', 'column', 'pie', 'polar']
                                },
                                series_name: {
                                    lbl: 'Series name',
                                    plot: {
                                        value: ''
                                    }
                                },
                                data_source: {
                                    type: 'select',
                                    lbl: 'data source',
                                    options: Object.keys(this.workspace.data_sources.sources),
                                    func: {
                                        change: this.update_columns.bind(this)
                                    }
                                },
                                x_div: {
                                    type: 'div',
                                    params: {
                                        x: {
                                            type: 'select',
                                            lbl: 'x column',
                                            options: []
                                        },
                                        x_reverse: {
                                            lbl: 'reverse x-axis',
                                            prop: {
                                                type: 'checkbox',
                                                checked: false
                                            }
                                        }
                                    },
                                    optional: {
                                        x_lbl: {lbl: 'x label'}
                                    }
                                },
                                y_div: {
                                    type: 'div',
                                    params: {
                                        y: {
                                            type: 'select',
                                            lbl: 'y column',
                                            options: []
                                        },
                                        y_reverse: {
                                            lbl: 'reverse y-axis',
                                            prop: {
                                                type: 'checkbox',
                                                checked: false
                                            }
                                        }
                                    },
                                    optional: {
                                        y_lbl: {lbl: 'y label'}
                                    }
                                },
                            },
                            optional: {
                                marker_div: {
                                    type: 'div',
                                    legend: 'Marker',
                                    params: {
                                        marker_lineWidth: {
                                            lbl: 'lineWidth',
                                            prop:{
                                                value: 1
                                            }
                                        },
                                        marker_symbol: {
                                            lbl: 'synmbol',
                                            type: 'select',
                                            options: ['circle', 'square', 'diamond', 
                                                    'triangle','triangle-down']
                                        },
                                        marker_radius: {
                                            lbl: 'radius',
                                            prop:{
                                                type: 'Number',
                                                value:4
                                            }
                                        },
                                        marker_enabled: {
                                            lbl: 'marker enabled',
                                            prop: {
                                                type: 'checkbox',
                                                checked: true
                                            }
                                        }
                                    },
                                    optional: {
                                        marker_fillColor: {
                                            lbl: 'fill color',
                                            prop: {
                                                value: 'rgba(100,10,10,.5)'
                                            }
                                        },
                                        marker_lineColor: {
                                            lbl: 'line color', 
                                            prop: {
                                                value: 'rgb(100,10,10)'
                                            }
                                        },
                                    }
                                }
                            }
                        }
                    }
                }
            },
            log_x: {
                lbl: 'log x',
                prop: {
                    type: 'checkbox',
                    checked: false
                }
            },
            log_y: {
                lbl: 'log_y',
                prop: {
                    type: 'checkbox',
                    checked: false
                }
            }
        },
        optional: {
            legend: {
                type: 'div',
                legend: 'Chart Legend',
                params: {
                    legend_align: {
                        type: 'select',
                        lbl: 'align',
                        options: ['left', 'center', 'right']
                    },
                    legend_borderWidth: {
                        lbl: 'borderWidth',
                        prop: {
                            type: 'Number',
                            value: 1
                        }
                    },
                    legend_enabled: {
                        lbl: 'enabled',
                        prop: {
                            type: 'checkbox',
                            checked: true
                        }
                    },
                    legend_floating: {
                        lbl: 'floating',
                        prop: {
                            type: 'checkbox',
                            checked: true
                        }
                    },
                    legend_layout: {
                        type: 'select', 
                        lbl: 'layout',
                        options: ['horizontal', 'vertical']
                    }
                },
                optional: {
                    legend_x: {
                        lbl: 'x',
                        prop: {
                            type: 'Number'
                        }
                    },
                    legend_y: {
                        lbl: 'y',
                        prop: {
                            type: 'Number'
                        }
                    }
                }
            },
            grid: {
                type: 'div',
                params: {
                    grid_gridLineWidth: {
                        lbl:'gridlineWidth',
                        prop: {
                            type: 'Number',
                            value: 1
                        }
                    },
                    grid_lineWidth: {
                        lbl:'lineWidth',
                        prop: {
                            type: 'Number',
                            value: 1
                        }
                    }
                }
            }
        }
    };
    this.gui = Toyz.Gui.initParamList(
        gui,
        options = {
            $parent: this.$div
        }
    );
};
Toyz.API.Highcharts.Gui.prototype.update_columns = function(event){
    //var data_source = event.currentTarget.value;
    var idx = $("input:radio[ name='series' ]:checked").val();
    idx = Number(idx.split('-')[1]);
    var params = this.gui.params.params.series_div.params.series.items[idx].params;
    var data_source = params.data_source.$input.val();
    var $x_input = params.x_div.params.x.$input;
    var $y_input = params.y_div.params.y.$input;
    $x_input.empty();
    $y_input.empty();
    for(var col in workspace.data_sources.sources[data_source].data){
        var x_opt = $('<option/>').val(col).html(col);
        var y_opt = $('<option/>').val(col).html(col);
        $x_input.append(x_opt);
        $y_input.append(y_opt);
    };
};

Toyz.API.Highcharts.Contents = function(params){
    this.type = 'Highcharts';
    this.tile = params.tile;
    this.$tile_div = params.$tile_div;
    this.$tile_div
        .removeClass('context-menu-tile')
        .addClass('context-menu-highcharts');
    this.workspace = params.workspace;
    this.settings = {};
    this.selected_pts = [];
    this.current_point = -1;
    //create tile context menu
    $.contextMenu({
        selector: '.context-menu-highcharts',
        callback: function(workspace, key, options){
            workspace[key](options);
        }.bind(null, workspace),
        items: Toyz.API.Highcharts.contextMenu_items(workspace, this)
    })
};
Toyz.API.Highcharts.Contents.prototype.update = function(params, param_val){
    // Allow user to either pass param_name, param_val to function or
    // dictionary with multiple parameters
    if(!(param_val===undefined)){
        params = {params:param_val};
    };
    for(var param in params){
        this[param] = params[param];
    }
};
Toyz.API.Highcharts.Contents.prototype.rx_info = function(from, info_type, info){
    var chart = this.$tile_div.highcharts();
    if(info_type=='select datapoints' || info_type=='unselect datapoints'){
        for(var s in this.settings.series){
            if(this.settings.series[s].data_source==from){
                for(var p=0;p<info.points.length;p++){
                    this.current_point = info.points[p];
                    if(info_type=='select datapoints'){
                        chart.series[s].data[info.points[p]].select(true, true);
                    }else{
                        chart.series[s].data[info.points[p]].select(false, true);
                    }
                };
            };
        };
    }else if(info_type='remove datapoints'){
        for(var i=0; i<this.settings.series.length; i++){
            for(var p=info.points.length-1; p>=0; p--){
                this.$tile_div.highcharts().series[i].data[info.points[p]].remove();
            }
        };
        this.$tile_div.highcharts().redraw();
    };
};
Toyz.API.Highcharts.Contents.prototype.save = function(){
    var tile = {
        type: this.type,
        settings: this.settings
    };
    return tile;
};
Toyz.API.Highcharts.Contents.prototype.create_chart = function(settings){
    this.settings = settings;
    //console.log('chart settings', this.settings);
    var chart_params = {
        title: {text: this.settings.title},
        chart: {
            zoomType: 'xy',
            events: {}
        },
        series: [],
    };
    var x_lbls = [];
    var y_lbls = [];
    
    if(!(this.settings.subtitle===undefined || this.settings.subtitle=='') || this.settings.subtitle===null){
        chart_params.subtitle={text: this.settings.subtitle};
    };
    for(var i=0; i<this.settings.series.length; i++){
        var data_source = this.settings.series[i].data_source;
        var data = this.workspace.data_sources.sources[data_source].data;
        // Add data points to chart
        var x = this.settings.series[i].x;
        var y = this.settings.series[i].y;
        var this_data = [];
        for(var j=0; j<data[x].length; j++){
            this_data.push({
                x:data[x][j], 
                y:data[y][j]
            });
        };
        // Label Axes
        var x_lbl = x;
        var y_lbl = y;
        if(this.settings.series[i].conditions.use_x_lbl && 
                !(this.settings.series[i].x_lbl===undefined) &&
                !(this.settings.series[i].x_lbl===null)){
            x_lbl = this.settings.series[i].x_lbl;
        };
        if(this.settings.series[i].conditions.use_y_lbl && 
                !(this.settings.series[i].y_lbl===undefined) &&
                !(this.settings.series[i].y_lbl===null)){
            y_lbl = this.settings.series[i].y_lbl;
        };
        if(x_lbls.indexOf(x_lbl)==-1){
            x_lbls.push(x_lbl);
        };
        if(y_lbls.indexOf(y_lbl)==-1){
            y_lbls.push(y_lbl);
        };
        
        var this_series = {
            type: this.settings.series[i].chart_type,
            name: this.settings.series[i].series_name,
            data: this_data,
        }
        // Add marker settings
        if(this.settings.series[i].conditions.use_marker_div){
            this_series.marker = {
                states:{
                    hover: {
                        radius: this.settings.series[i].marker_radius*1.5,
                        lineWidth: this.settings.series[i].marker_lineWidth
                    }
                }
            };
            for(var setting in this.settings.series[i]){
                if(setting.indexOf('marker_')>-1){
                    this_series.marker[setting.slice(7,setting.length)] = 
                        this.settings.series[i][setting];
                };
            };
        };
        chart_params.series.push(this_series);
        
        // Change the selection behavior of a point so that it updates other points
        chart_params.plotOptions = {
            series: {
                allowPointSelect: true,
                point: {
                    events: {
                        select: function(event){
                            var point = event.currentTarget;
                            var series_idx = point.series.index;
                            var point_idx = point.series.data.indexOf(point);
                            if(this.current_point!=point_idx){
                                this.update_selected(
                                    series_idx, 
                                    [point_idx], 
                                    'select datapoints'
                                );
                            };
                            this.current_point=-1;
                        }.bind(this),
                        unselect: function(event){
                            var point = event.currentTarget;
                            var series_idx = point.series.index;
                            var point_idx = point.series.data.indexOf(point);
                            if(this.current_point!=point_idx){
                                this.update_selected(
                                    series_idx, 
                                    [point_idx], 
                                    'unselect datapoints'
                                );
                            };
                            this.current_point=-1;
                        }.bind(this)
                    }
                }
            }
        };
        
        // By default highcharts will zoom in to a selected area. If the user has
        // instead chosen to select points, this changes the behavior.
        // The `return false` prevents the code from zooming
        if(this.settings.selection=='selection'){
            // TODO: Improve this algorithm to work in log(n) time using a
            // binary search
            chart_params.chart.events.selection = function(event){
                var selected_one = false;
                for(var s=0; s<this.series.length; s++){
                    for(var i=0; i<this.series[s].data.length; i++){
                        var point = this.series[s].data[i];
                        if (point.x > event.xAxis[0].min &&
                            point.x < event.xAxis[0].max &&
                            point.y > event.yAxis[0].min &&
                            point.y < event.yAxis[0].max
                        ){
                            if(selected_one){
                                point.select(true, true);
                            }else{
                                point.select(true, false);
                                selected_one = true;
                            }
                        };
                    };
                };
                return false;
            };
        }else{
            chart_params.chart.zoomType = this.settings.selection;
        };
    };
    // Update the labels for the chart
    if(x_lbls.length==1){
        chart_params.xAxis = {
            title: {
                text: x_lbls[0]
            }
        };
        if(settings.series[0].x_reverse){
            chart_params.xAxis.reversed = true;
        };
    }else{
        // TODO: add axis for each series
        chart_params.xAxis = {
            title: {
                text: x_lbls[0]
            }
        };
        if(settings.series[0].x_reverse){
            chart_params.xAxis.reversed = true;
        };
    };
    if(y_lbls.length==1){
        chart_params.yAxis = {
            title: {
                text: y_lbls[0]
            }
        };
        if(settings.series[0].y_reverse){
            chart_params.yAxis.reversed = true;
        };
    }else{
        //TODO: add axis for each series
        chart_params.yAxis = {
            title: {
                text: y_lbls[0]
            }
        };
        if(settings.series[0].y_reverse){
            chart_params.yAxis.reversed = true;
        };
    };
    // Set the grid
    if(settings.conditions.use_grid===true){
        for(var setting in settings){
            if(setting.indexOf('grid_')>-1){
                chart_params.xAxis[setting.slice(5,setting.length)] = settings[setting]
                chart_params.yAxis[setting.slice(5,setting.length)] = settings[setting]
            }
        }
    };
    // Log scale?
    if(settings.log_x){
        chart_params.xAxis.type = 'logarithmic'
    };
    if(settings.log_y){
        chart_params.yAxis.type = 'logarithmic'
    }
    
    // Set the legend
    if(settings.conditions.use_legend===true){
        chart_params.legend = {};
        for(var setting in settings){
            if(setting.indexOf('legend_')>-1){
                chart_params.legend[setting.slice(7,setting.length)] = settings[setting];
            }
        }
    };
    
    //console.log('chart_params', chart_params);
    this.$tile_div.highcharts(chart_params);
};
Toyz.API.Highcharts.Contents.prototype.set_tile = function(settings){
    this.create_chart(settings);
};
Toyz.API.Highcharts.Contents.prototype.update_selected = 
        function(series_idx, points, info_type){
    var data_source = this.settings.series[series_idx].data_source;
    this.workspace.data_sources.sources[data_source].rx_info(
        from=this.tile.id,
        info_type=info_type,
        info={
            points: points,
        }
    );
};
Toyz.API.Highcharts.Contents.prototype.remove_points = function(){
    var pts = [];
    var data = this.$tile_div.highcharts().series[0].data;
    for(var i=0;i<data.length; i++){
        if(data[i].selected){
            pts.push(i);
        }
    };
    this.workspace.data_sources.sources[this.settings.series[0].data_source].rx_info(
        from='',
        info_type='remove datapoints',
        info={
            points: pts,
        }
    );
}

console.log('Toyz Highcharts API loaded');