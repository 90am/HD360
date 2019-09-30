require.undef('events');

define('events', ['d3'], function (d3) {

    function eventTree(container, tree, width, height) {

        let m = {
            left: 50,
            right: 20, 
            top: 20, 
            bottom: 150
          };

        let legend_h = 15,
            legend_w = 150;

        width = width - m.right - m.left;
        height = height - m.top - m.bottom;
        
        let svg = d3.select(container).append("svg")
            .attr('width', width + m.right + m.left)
            .attr('height', height + m.top + m.bottom);

        let vis = svg.append("g")
            .attr("transform", "translate(" + m.left + "," + m.top + ")");
        
        let legend = svg.append("g")
            .attr("transform", "translate("+m.left+","+(height+m.top+(m.bottom/3))+")");

        const event_width = 15;

        let y = d3.scaleLinear().range([height, 0]);
        let x = d3.scaleLinear().range([0, width-event_width]);
        let x_axis = d3.scaleLinear().range([0, width]);
        let color = d3.scaleOrdinal(d3.schemeCategory20); // .domain([...Array(20).keys()]);
        let event_prob_color = d3.scaleLinear().domain([0,1]).range(["white","black"]);

        let partition = d3.partition().size([height, width]);
        
        function setRanges(){
            y.range([height, 0]);
            x.range([0, width-event_width]);
            x_axis.range([0, width]);
            partition.size([height, width]);
        }
        
        /*let tip = d3.tip()
        .attr('class', 'd3-tip')
        .offset([-10, 0])
        .html(function (d) {
            return "<span style='color:white'>Event: " + d.data.name + "</span></br>"; 
            "<span style='color:white'>Sequence Count: " + d.data.meta.count + "</span></br>" +
            "<span style='color:lightcoral'>" + Math.round(d.data.meta.closed_percentage_before*100) + 
            "% closed before (" + d.data.meta.closed_before.length + ")</span></br>" +
                "<span style='color:lightcoral'>" + Math.round(d.data.meta.closed_percentage_after*100) + 
            "% closed after (" + d.data.meta.closed_after.length + ")</span></br>" +
            "<span style='color:lightgreen'>Relative Time to Previous Event: " + Math.round(d.data.meta.avg_time/(24*365)*100)/100 + " years</span></br>";
        });

        svg.call(tip);*/

        let root;
        function sum_time(node, time) {
            node.meta.avg_time_sum = node.meta.avg_time + time;
            if(node.children){
                node.children.forEach((n) => {
                sum_time(n, node.meta.avg_time_sum);
                });
            }
        };
        
        function update_data() {
            sum_time(tree, 0);
            if(Object.keys(tree).length > 0) {
                root = partition(d3.hierarchy(tree,  function(d) { return d.children; }).sum(function(d) { return d.size;}));
            }
                root.descendants().forEach((n, i) => {
                n.id = "node_"+i;
            });
            x.domain(d3.extent(root.descendants(), (d) => {return d.data.meta.avg_time_sum;}));
            x_axis.domain(x.domain());
            y.domain([0, root.data.meta.count]);
        };

        function draw(){
            update_data();
      
            let probs = vis.selectAll(".eventProb").data(root.descendants());
      
            probs.enter().append("rect")
              .attr("class", "eventProb")
              .attr("x", (d) => {return Math.max(0, (d.depth-1))*event_width + x(d.data.meta.avg_time_sum-d.data.meta.avg_time);})
              .attr("y", (d) => { return d.x0;})
              .attr("width", (d) => { return (d.depth*event_width + x(d.data.meta.avg_time_sum)) - (Math.max(0, (d.depth-1))*event_width + x(d.data.meta.avg_time_sum-d.data.meta.avg_time));})
              .attr("height", (d) => { return d.x1-d.x0;})
              .attr("fill", (d) => {return ((d.data.meta.outcome_ratio.failing) ? event_prob_color(d.data.meta.outcome_ratio.failing) : event_prob_color(0.0))}) 
              .attr("stroke", "white");
      
            let event = vis.selectAll(".event").data(root.descendants());
      
            event.enter().append("rect")
                .attr("class", "event")
                .attr("id", (d) => {return d.id;})
                .attr("x", (d) => {return d.depth*event_width + x(d.data.meta.avg_time_sum);})
                .attr("y", (d) => { return d.x0;})
                .attr("width", (d) => { return event_width;})
                .attr("height", (d) => { return d.x1-d.x0;})
                .attr("fill", (d) => { if(d.data.name === "all") return "#E4EEEB"; else return color(d.data.name);})
                .attr("stroke", "white")
                .on('mouseover', (d) => {
                    //tip.show(d);
                })
                .on('mouseout', (d) => {
                    //tip.hide(d);
                })
                .on("click", (d) => {

                });
            
            vis.append("g")
              .attr("class", "eventAxis")
              .attr("transform", "translate(0," + height + ")")
              .call(d3.axisBottom(x_axis).ticks(0).tickFormat((l) => {return Math.round(l/(24*365));}));
      
            vis.append("text")
              .attr("class", "eventAxisLabel")
              .attr("transform", "translate(" + width + " ," + (height + m.top + 20) + ")")
              .style("text-anchor", "end")
              .text("Relative Time to Start");
      
            vis.append("g")
              .attr("class", "eventAxis")
              .call(d3.axisLeft(y).ticks(5));
      
            vis.append("text")
              .attr("class", "eventAxisLabel")
              .attr("transform", "rotate(-90)")
              .attr("y", 0 - m.left + 5)
              .attr("x",0)
              .attr("dy", "1em")
              .style("text-anchor", "end")
              .text("Sequence Count");  
        
            let legend_row = 0;
            let legend_column = 0;

            color.domain().forEach((f) => {
                let g = legend.append("g")
                    .attr("class", "legend")
                    .attr("id", "legend_"+f)
                    .attr("transform", "translate("+(5 + legend_w*legend_column)+"," + (5 + legend_h*legend_row+5*legend_row) + ")");

                g.append("rect")
                    .attr("x", 0)
                    .attr("y", 0)
                    .attr("width", legend_h)
                    .attr("height", legend_h)
                    //.attr("stroke", "black")
                    .attr("shape-rendering", "crispEdges")
                    .attr("fill", color(f));

                g.append("text")
                    .attr("class", "legend")
                    .attr("transform", "translate(20, 12 )")
                    .text(f);
                
                legend_row += 1;
                if(legend_row % 3 == 0){
                    legend_column += 1;
                    legend_row = 0;
                }

            });
        };

        draw()
            
    }

    return eventTree;
});
