// Function to get the current width of the plot container
function getPlotWidth() {
    const plotContainer = document.getElementById('plot');
    return plotContainer.clientWidth - 100; // Subtract margins
}

// Constants for visualization
const margin = { top: 40, right: 40, bottom: 60, left: 60 };
let width = getPlotWidth() - margin.left - margin.right;
const height = 600 - margin.top - margin.bottom;

// Create SVG container
const svg = d3.select("#plot")
    .append("svg")
    .attr("width", "100%")
    .attr("height", height + margin.top + margin.bottom)
    .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

// Create tooltip
const tooltip = d3.select("body")
    .append("div")
    .attr("class", "tooltip");

// Global variables for data management
let fullData = [];
let currentStartIndex = 0;

// Handle window resize
window.addEventListener('resize', () => {
    width = getPlotWidth() - margin.left - margin.right;
    if (fullData.length > 0) {
        updateVisualization();
    }
});

// Function to process and visualize data
function processData(data) {
    fullData = data;
    // Convert time column to Date objects
    const parseTime = d3.timeParse("%Y-%m-%d %H:%M:%S");
    fullData.forEach(d => {
        // Check each column for time format
        Object.keys(d).forEach(key => {
            // Try to parse as date if it matches the expected format
            if (typeof d[key] === 'string' && d[key].match(/^\d{4}-\d{2}-\d{2}( \d{2}:\d{2}:\d{2})?$/)) {
                d[key] = parseTime(d[key]);
            }
            // Convert numeric strings to numbers
            else if (!isNaN(d[key])) {
                d[key] = +d[key];
            }
        });
    });

    // Get column names for dropdowns
    const columns = Object.keys(fullData[0]);
    
    // Clear and populate dropdowns
    ['x-axis-select', 'y-axis-select', 'color-column-select'].forEach(id => {
        const select = d3.select(`#${id}`);
        select.selectAll('option').remove();
        select.append('option').text('Select Column').attr('value', '');
        columns.forEach(column => {
            select.append('option').text(column).attr('value', column);
        });
    });

    // Show controls and navigation
    d3.select('.controls').style('display', 'block');
    d3.select('.navigation').style('display', 'block');

    // Function to update data window position text
    function updatePositionText() {
        const displayPoints = +d3.select("#display-points").property("value");
        const end = Math.min(currentStartIndex + displayPoints, fullData.length);
        d3.select("#data-position").text(
            `${currentStartIndex + 1} - ${end} of ${fullData.length}`
        );
    }

    // Declare updateVisualization in global scope so we can call it from window resize
    window.updateVisualization = function() {
        const xColumn = d3.select("#x-axis-select").property("value");
        const yColumn = d3.select("#y-axis-select").property("value");
        const colorColumn = d3.select("#color-column-select").property("value");
        const displayPoints = +d3.select("#display-points").property("value");

        if (!xColumn || !yColumn) return;

        // Update width based on current container size
        width = getPlotWidth() - margin.left - margin.right;

        // Get visible data window
        const visibleData = fullData.slice(currentStartIndex, currentStartIndex + displayPoints);

        // Clear previous elements
        svg.selectAll("*").remove();

        // Create scales
        const xScale = (fullData[0][xColumn] instanceof Date) 
            ? d3.scaleTime()
            : d3.scaleLinear();
        
        xScale
            .domain(d3.extent(visibleData, d => d[xColumn]))
            .range([0, width]);

        const yScale = d3.scaleLinear()
            .domain(d3.extent(visibleData, d => d[yColumn]))
            .range([height, 0]);

        // Create color scale
        const colorScale = d3.scaleLinear()
            .domain([-1, 0, 1])
            .range(["blue", "gray", "red"]);

        // Add axes
        svg.append("g")
            .attr("transform", `translate(0,${height})`)
            .call(d3.axisBottom(xScale))
            .append("text")
            .attr("x", width / 2)
            .attr("y", 40)
            .attr("fill", "black")
            .style("text-anchor", "middle")
            .text(xColumn);

        svg.append("g")
            .call(d3.axisLeft(yScale))
            .append("text")
            .attr("transform", "rotate(-90)")
            .attr("y", -40)
            .attr("x", -height / 2)
            .attr("fill", "black")
            .style("text-anchor", "middle")
            .text(yColumn);

        // Add dots
        svg.selectAll("circle")
            .data(visibleData)
            .enter()
            .append("circle")
            .attr("cx", d => xScale(d[xColumn]))
            .attr("cy", d => yScale(d[yColumn]))
            .attr("r", 5)
            .attr("fill", d => {
                if (colorColumn && !isNaN(d[colorColumn])) {
                    const value = d[colorColumn];
                    const normalizedValue = Math.max(-1, Math.min(1, value));
                    return colorScale(normalizedValue);
                }
                return "steelblue";
            })
            .attr("opacity", 0.7)
            .on("mouseover", function(event, d) {
                d3.select(this)
                    .attr("r", 8)
                    .attr("opacity", 1);
                
                tooltip.style("opacity", 1)
                    .html(`${xColumn}: ${d[xColumn]}<br/>${yColumn}: ${d[yColumn]}${colorColumn ? `<br/>${colorColumn}: ${d[colorColumn]}` : ""}`)
                    .style("left", (event.pageX + 10) + "px")
                    .style("top", (event.pageY - 10) + "px");
            })
            .on("mouseout", function() {
                d3.select(this)
                    .attr("r", 5)
                    .attr("opacity", 0.7);
                
                tooltip.style("opacity", 0);
            });

        updatePositionText();
    };

    // Navigation event handlers
    d3.select("#prev-btn").on("click", () => {
        const displayPoints = +d3.select("#display-points").property("value");
        currentStartIndex = Math.max(0, currentStartIndex - displayPoints);
        updateVisualization();
    });

    d3.select("#next-btn").on("click", () => {
        const displayPoints = +d3.select("#display-points").property("value");
        if (currentStartIndex + displayPoints < fullData.length) {
            currentStartIndex += displayPoints;
            updateVisualization();
        }
    });

    // Add event listeners to dropdowns and display points input
    d3.select("#x-axis-select").on("change", updateVisualization);
    d3.select("#y-axis-select").on("change", updateVisualization);
    d3.select("#color-column-select").on("change", updateVisualization);
    d3.select("#display-points").on("change", () => {
        currentStartIndex = 0;  // Reset to beginning when changing display points
        updateVisualization();
    });
}

// File input handler
document.getElementById('csv-file').addEventListener('change', function(event) {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            const csvData = e.target.result;
            const parsedData = d3.csvParse(csvData);
            if (parsedData && parsedData.length > 0) {
                processData(parsedData);
            } else {
                console.error('No data found in CSV file');
                alert('No data found in the CSV file. Please check the file format.');
            }
        };
        reader.onerror = function() {
            console.error('Error reading file');
            alert('Error reading the file. Please try again.');
        };
        reader.readAsText(file);
    }
}); 