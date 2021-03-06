"use strict";

document.addEventListener('deviceready', onDeviceReady, false);

 function onDeviceReady() {
        screen.lockOrientation('portrait');
    }

var drawingApp = (function () {
    
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
      
    function addEventListeners() {
        
        $('#clearButton').click(function(e) {
            $('#colorPicker').val("#ff0000");  
            $('#brushSize').val(5).slider("refresh");
            resetCanvasContent();
            deviceMotion.clear();
            redraw();
        });
        
        $('#positionCalibrationButton').click(function(e) {
            deviceMotion.clear();
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
            if(!($('#endless').is(':checked')) && mobile_system != '')
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
            
    var init = function() {               
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
        
    };
    
    return {
        init: init
    };
}());

var deviceMotion = (function() {
    
    var betaNorm = 0;
    var gammaNorm = 0;    
    var normValuesSet = false;
    var receivedFirstOrientationEvent;
        
    var init = function() {
        
        receivedFirstOrientationEvent = (mobile_system != '');        
        
        var handleOrientation = function(e) {  

            if(!receivedFirstOrientationEvent && e.beta && e.gamma) { 
                $("#keyTip").hide();
                $('#canvas-mode-fieldset').show(); 
                $('#positionCalibrationButton').show();                
                $("#endless").prop('disabled', false);            
                $("#endless").prop('checked', true); 
                receivedFirstOrientationEvent = true;
            }

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
            
            if(yOffset == 0 && xOffset == 0) {
                return;
            } else if (yOffset != 0 && xOffset != 0) {
                yOffset /= 2;
                xOffset /= 2;
            }
            
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
        
        var handleKeyDown = function(e) {
            
            var xOffset = 0;
            var yOffset = 0;
            
            if (e.keyCode == '38') {
                // up arrow
                yOffset = 10;
            }
            else if (e.keyCode == '40') {
                // down arrow
                yOffset = -10;
            }
            else if (e.keyCode == '37') {
               // left arrow
               xOffset = 10;
            }
            else if (e.keyCode == '39') {
               // right arrow
               xOffset = -10;
            }
            
            if(yOffset == 0 && xOffset == 0) {
                return;
            } else if (yOffset != 0 && xOffset != 0) {
                yOffset /= 2;
                xOffset /= 2;
            }
            
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
        document.onkeydown = handleKeyDown;
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
