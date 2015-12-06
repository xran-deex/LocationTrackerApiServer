(function(app){
    'use strict';
    /* jshint esnext: true */
    var ItemModel = function(parent, opt){
        var self = this;
        this.name = opt.name;
        this.id = opt.id;

        this.delete = function(){
            let yes = confirm('Are you sure?');
            if(yes){
                m.request({method:'delete', url:app.APIURL+'/data?apikey='+app.user().apikey, data:{id: self.id}}).then(function(res){
                    parent.data(parent.data().filter(function(item){
                        return item !== self;
                    }));
                    Materialize.toast(self.name + ' deleted', 3000);
                });
            }
        };
    };

    var Model = function(){
        var self = this;
        this.data = m.prop([]);
        this.test_result = m.prop();
        this.fetchData = function(cb){
            if(app.user() && app.user().email)
            m.request({method:'get', url:app.APIURL+'/data?apikey='+app.user().apikey}).then(function(res){
                cb(res);
            });
        };
        this.update = function(){
            self.fetchData(function(data){
                self.data(data.map(function(item){
                    item = new ItemModel(self, item);
                    item.selected = m.prop(false);
                    return item;
                }));
                self.data().sort(function(i, j){
                    if(i.name < j.name){
                        return 1;
                    } else if (i.name > j.name){
                        return -1;
                    }
                    return 0;
                });
            });
        };
    };

    var VM = function(){
        var self = this;
        self.ws = null;
        self.model = app.model = new Model();
        app.model.update();
        this.showNameForm = m.prop(false);
        this.name = m.prop();
        self.log = m.prop('');
        self.wait = m.prop(false);
        this.train_btn_text = m.prop('Run');
        this.hasSelected = function(){
            return self.model.data().filter(function(item){
                return item.selected();
            }).length > 0;
        };

        this.chart_type = m.prop('pie');

        this.switchChartType = function(){
            if(self.chart_type() == 'bar') self.chart_type('pie');
            else self.chart_type('bar');
        };

        this.run = function(){
            self.wait(true);
            setTimeout(function(){
                let ids = self.model.data().filter(function(item){
                    return item.selected();
                }).map(function(item){
                    return item.id;
                });
                Materialize.toast('Testing...', 2000);
                m.request({method:'post', url:app.APIURL+'/test?apikey='+app.user().apikey, data: {ids: ids, name: self.name()}}).then(function(res){
                    console.log(res);
                    self.model.test_result(res);
                    self.model.data().forEach(function(item){item.selected(false);});
                    self.wait(false);
                }, function(err){
                    console.log(err);
                });
            },0);
        };
    };

    // the app controller
    var ctrl = function(){
        this.vm = new VM();
    };

    var confirmView = function(ctrl){
        if(ctrl.vm.hasSelected()){
            return m('div.row.flex-container', [
                m('div.btnspinner', [
                    (function(){
                        if(!ctrl.vm.wait())
                        return [
                            m('button.btn.waves-effect.waves-light', {onclick: ctrl.vm.run}, 'Run tests'),
                        ];
                    })(),
                    (function(){
                        if(ctrl.vm.wait())
                        return m('div.preloader-wrapper.big.active.spinner', [
                            m('div.spinner-layer.spinner-blue-only', [
                                m('div.circle-clipper.left', [
                                    m('div.circle')
                                ]),
                                m('div.gap-patch', [
                                    m('div.circle')
                                ]),
                                m('div.circle-clipper.right', [
                                    m('div.circle')
                                ])
                            ])
                        ]);
                    })()
                ])
            ]);
        }
    };

    var tableview = function(ctrl){
        return m('table', [
            m('thead', [
                m('tr', [
                    m('th', 'Include'),
                    m('th', 'Name'),
                ]),
            ]),
            m('tbody', [
                ctrl.vm.model.data().map(function(item, i){
                    return m('tr', [
                        m('td', [
                            m('input[type=checkbox]', {id: 'item'+i, onclick: m.withAttr("checked", item.selected), checked: item.selected()}),
                            m('label', {for: 'item'+i})
                        ]),
                        m('td', item.name),
                    ]);
                })
            ])
        ]);
    };

    var resultView = function(ctrl){
        if(!ctrl.vm.model.test_result()) return;
        d3.select(".result").selectAll('*').remove();
        if(ctrl.vm.chart_type() == 'bar') render_bar_chart(ctrl);
        else render_pie_chart(ctrl);

        return m('div.row.flex-container', [
            m('div.btnspinner', [
                m('button.btn.waves-effect.waves-light', {onclick: ctrl.vm.switchChartType}, 'Switch charts')
            ])
        ]);

    };

    /**
     *  Draws a series of bar charts with the test results
     */
    var render_bar_chart = function(ctrl){
        var margin = {top: 20, right: 20, bottom: 30, left: 40},
        width = 660 - margin.left - margin.right,
        height = 500 - margin.top - margin.bottom;

        var x0 = d3.scale.ordinal().rangeRoundBands([0, width], 0.1);

        var x1 = d3.scale.ordinal();

        var y = d3.scale.linear()
        .range([height, 0]);

        var color = d3.scale.ordinal()
        .range(["#98abc5", "#8a89a6", "#7b6888", "#6b486b", "#a05d56", "#d0743c", "#ff8c00"]);

        var xAxis = d3.svg.axis()
        .scale(x0)
        .orient("bottom");

        var yAxis = d3.svg.axis()
        .scale(y)
        .orient("left")
        .tickFormat(d3.format(".2s"));

        var svg = d3.select(".result").append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

        var data = ctrl.vm.model.test_result();

        var names = data.map(function(key) { return key.name; });

        x0.domain(names);
        x1.domain(names).rangeRoundBands([0, x0.rangeBand()]);
        y.domain([0, d3.max(data, function(d) { return d3.max(d.items, function(d) { return d.value; }); })]);

        svg.append("g")
        .attr("class", "x axis")
        .attr("transform", "translate(0," + height + ")")
        .call(xAxis);

        svg.append("g")
        .attr("class", "y axis")
        .call(yAxis)
        .append("text")
        .attr("transform", "rotate(-90)")
        .attr("y", 6)
        .attr("dy", ".71em")
        .style("text-anchor", "end")
        .text("Prediction Count");

        var location = svg.selectAll(".location")
        .data(data)
        .enter().append("g")
        .attr("class", "g")
        .attr("transform", function(d) { return "translate(" + x0(d.name) + ",0)"; });

        location.selectAll("rect")
        .data(function(d) { return d.items; })
        .enter().append("rect")
        .attr("width", x1.rangeBand())
        .attr("x", function(d) { return x1(d.name); })
        .attr("y", function(d) { return y(d.value); })
        .attr("height", function(d) { return height - y(d.value); })
        .style("fill", function(d) { return color(d.name); });

        var legend = svg.selectAll(".legend")
        .data(names.slice().reverse())
        .enter().append("g")
        .attr("class", "legend")
        .attr("transform", function(d, i) { return "translate(0," + i * 20 + ")"; });

        legend.append("rect")
        .attr("x", width - 18)
        .attr("width", 18)
        .attr("height", 18)
        .style("fill", color);

        legend.append("text")
        .attr("x", width - 24)
        .attr("y", 9)
        .attr("dy", ".35em")
        .style("text-anchor", "end")
        .text(function(d) { return d; });
    };

    /**
     *  Draws a series of pie charts with the test results
     */
    var render_pie_chart = function(ctrl){
        var margin = {top: 20, right: 20, bottom: 30, left: 40},
        width = 660 - margin.left - margin.right,
        height = 500 - margin.top - margin.bottom;
        var data = ctrl.vm.model.test_result();
        var names = data.map(function(key) { return key.name; });
        var color =  d3.scale.ordinal()
        .range(["#98abc5", "#8a89a6", "#7b6888"]);//, "#6b486b", "#a05d56", "#d0743c", "#ff8c00"]);

        var m = 10,
        r = 100,
        z = color;

        var pie = d3.layout.pie()
        .value(function(d) { return d; });

        // Define an arc generator. Note the radius is specified here, not the layout.
        var arc = d3.svg.arc()
        .innerRadius(r / 2)
        .outerRadius(r);

        var svg = d3.select(".result").selectAll("div")
        .data(data)
        .enter().append("div")
        .style("display", "inline-block")
        .style("width", (r + m) * 2 + "px")
        .style("height", (r + m) * 2 + "px")
        .append("svg:svg")
        .attr("width", (r + m) * 2)
        .attr("height", (r + m) * 2)
        .append("svg:g")
        .attr("transform", "translate(" + (r + m) + "," + (r + m) + ")");

        svg.append("svg:text")
        .attr("dy", ".35em")
        .attr("text-anchor", "middle")
        .text(function(d) { return d.name; });

        var g = svg.selectAll("g")
        .data(function(d) {
            return pie(d.percents.map(function(i){
                return i.value;
            }));
        })
        .enter().append("svg:g");

        // Add a colored arc path, with a mouseover title showing the count.
        g.append("svg:path")
        .attr("d", arc)
        .style("fill", function(d) { return z(d.data); })
        .append("svg:title")
        .text(function(d) { return d.data; });

        var legend = svg.selectAll(".legend")
        .data(names.slice().reverse())
        .enter().append("g")
        .attr("class", "legend")
        .attr("transform", function(d, i) { return "translate(0," + i * 20 + ")"; });

        legend.append("rect")
        .attr("x", width - 18)
        .attr("width", 18)
        .attr("height", 18)
        .style("fill", color);

        legend.append("text")
        .attr("x", width - 24)
        .attr("y", 9)
        .attr("dy", ".35em")
        .style("text-anchor", "end")
        .text(function(d) { return d; });

        // Add a label to the larger arcs, translated to the arc centroid and rotated.
        g.filter(function(d) { return d.endAngle - d.startAngle > 0.2; }).append("svg:text")
        .attr("dy", ".35em")
        .attr("text-anchor", "middle")
        .attr("transform", function(d) { return "translate(" + arc.centroid(d) + ")";})//rotate(" + angle(d) + ")"; })
        .text(function(d) { return (d.value * 100).toFixed(0) + '%'; });

        // Computes the label angle of an arc, converting from radians to degrees.
        function angle(d) {
            var a = (d.startAngle + d.endAngle) * 90 / Math.PI - 90;
            return a > 90 ? a - 180 : a;
        }
    };

    app.Analysis = {
        controller: ctrl,
        view: function(ctrl){
            return [
                m('div.container', [
                    m('h4', 'Select a data set'),
                    m('p', 'The selected data set will be used to test the neural network for accuracy. These locations will be tested against the default network.'),
                    confirmView(ctrl),
                    m('div.result'),
                    resultView(ctrl),
                    tableview(ctrl),
                ])
            ];
        }
    };

})(app = window.app || {});
