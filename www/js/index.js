"use strict";

var drawingApp = (function () {

    var deviceMotion;
    
    var canvas,
        context;
        
    var paint,
        offsetLeft = 0,
        offsetTop = 0;

    // drawings of user
    var clickX = [], 
        clickY = [], 
        clickDrag = [];
    var clickColor = [], clickSize = [];
    
    function resetCanvasContent() {        
        clickX = [];
        clickY = [];
        clickDrag = [];
        clickColor = [];
        clickSize = [];
    }

    function addClick(x, y, dragging) {
      clickX.push(x);
      clickY.push(y);
      clickDrag.push(dragging);
      clickColor.push($('#colorPicker').val());  
      clickSize.push($('#brushSize').val());
    }
    
    function redraw(){
        context.clearRect(0, 0, context.canvas.width, context.canvas.height); // Clear canvas
        
        // define stroke style        
        context.lineJoin = "round";
                
        // draw everything anew        
        for(var i=0; i < clickX.length; i++) {        
            context.lineWidth = clickSize[i];
            context.strokeStyle = clickColor[i];
            context.beginPath();
            if(clickDrag[i] && i){
                context.moveTo(clickX[i-1], clickY[i-1]);
            } else {
                context.moveTo(clickX[i]-1, clickY[i]);
            }
            context.lineTo(clickX[i], clickY[i]);
            context.closePath();
            context.stroke();
        }
    }
    
    function onDeviceReady() { 
        alert("ready");
        screen.lockOrientation('portrait');
        alert("portrait?");
        this.redraw();
    }
    
    function addEventListeners() {
        
        $('#clearButton').click(function(e) {
            $('#colorPicker').val("#ff0000");  
            $('#brushSize').val(5).slider("refresh");
            resetCanvasContent();
            deviceMotion.clear();
            redraw();
        });
        
        var start = function(e){
            var mouseX = e.pageX - this.offsetLeft;
            var mouseY = e.pageY - this.offsetTop;
                
            paint = true;
            addClick(e.pageX - this.offsetLeft, e.pageY - this.offsetTop);
            redraw();
        }
        
        var move = function(e){
            var mouseX = (e.changedTouches ? e.changedTouches[0].pageX : e.pageX) - this.offsetLeft;
            var mouseY = (e.changedTouches ? e.changedTouches[0].pageY : e.pageY) - this.offsetTop;
                
                if (paint) {
                    addClick(mouseX, mouseY, true);
                    redraw();
                }

                e.preventDefault();
        }
            
        var end = function(e){
            paint = false;
        }
        
        // touch event listeners
        canvas.addEventListener("touchstart", start, false);
        canvas.addEventListener("touchmove", move, false);
        canvas.addEventListener("touchend", end, false);
        canvas.addEventListener("touchcancel", end, false);    
            
        // mouse event listeners
        canvas.addEventListener("mousedown", start, false);
        canvas.addEventListener("mousemove", move, false);
        canvas.addEventListener("mouseup", end);
        canvas.addEventListener("mouseout", end, false);
                       
        var handleMovement = function(e) {
            if(!($('#endless').is(':checked')))
                return;
            
            var xOffset = e.detail.xOffset;
            if(xOffset != 0) {
                for(var i = 0; i < clickX.length; i++) {
                    clickX[i] += xOffset;
                }                 
            }
            var yOffset = e.detail.yOffset;
            if(yOffset != 0) {
                for(var i = 0; i < clickY.length; i++) {
                    clickY[i] += yOffset;
                }  
            }

            redraw();
        }
        
        window.addEventListener('moveCanvas', handleMovement, false);
    }
            
    var init = function(devMot) {
       
        deviceMotion = devMot;
        
        // Create the canvas (Neccessary for IE because it doesn't know what a canvas element is)
        canvas = document.createElement('canvas');
        
        canvas.setAttribute('width', ($(window).width()));
        
        if(mobile_system === '') {
            canvas.setAttribute('height', ($(window).height() - 120));
        } else {
            canvas.setAttribute('height', (0.81* $(window).height()));
        }
        
        
        canvas.setAttribute('id', 'canvas');
        document.getElementById('canvasDiv').appendChild(canvas);
        if (typeof G_vmlCanvasManager !== "undefined") {
            canvas = G_vmlCanvasManager.initElement(canvas);
        }
        context = canvas.getContext("2d"); 
        addEventListeners();
        document.addEventListener('deviceready', this.onDeviceReady, false);
    };
    
    return {
        init: init
    };
}());

var deviceMotion = (function() {
    
    var betaNorm = 0;
    var gammaNorm = 0;    
    var normValuesSet = false;
        
    var init = function() {
        var handleOrientation = function(e) {            
            var beta   = e.beta;
            var gamma  = e.gamma;
            
            if(!normValuesSet) {
                betaNorm = beta;
                gammaNorm = gamma;
                normValuesSet = true;
            }               
            
            var xOffset = 0;
            if(gamma < -15)
                xOffset = 10;
            else if (gamma > 15)
                xOffset = -10;
                
                
            var yOffset = 0;
            if(beta < (betaNorm - 15))
                yOffset = 10;
            else if (beta > (betaNorm + 15))
                yOffset = -10;
                        
            var event = new CustomEvent('moveCanvas', 
                {
                    detail: {
                        xOffset: xOffset,
                        yOffset: yOffset
                    },
                    bubbles: true,
                    cancelable: true
                });
            window.dispatchEvent(event);        
        }

        window.addEventListener("deviceorientation", handleOrientation, true);          
    };
    
    var clear = function() {
        betaNorm = 0;        
        gammaNorm = 0;
        normValuesSet = false;
    }
    
    return {
        init: init,
        clear: clear
    };
}());
