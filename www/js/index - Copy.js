
var drawingApp = (function () {

    "use strict";

    var deviceMotion;
    
    var canvas,
        context;
        
    var paint,
        offsetLeft = 0,
        offsetTop = 0;

    // drawings of user
    var clickX = [], clickY = [], clickDrag = [];
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
            deviceMotion.resetPosition();
            
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
            var offset = e.detail.offset;
            if(offset == 0)
                return;
            
            if(($('#fixed').is(':checked')))
                return;
            
            for(var i = 0; i < clickX.length; i++) {
                clickX[i] += offset;
            }
            redraw();
        }
        
        window.addEventListener('moveCanvas', handleMovement, false);
    }
            
    var init = function(devMot) {
       
        deviceMotion = devMot;
        
        // Create the canvas (Neccessary for IE because it doesn't know what a canvas element is)
        canvas = document.createElement('canvas');
        
        canvas.setAttribute('width', $(window).width());
        canvas.setAttribute('height', ($(window).height() - $('#header').height() -  2 * $('#footer').height()));
        canvas.setAttribute('id', 'canvas');
        document.getElementById('canvasDiv').appendChild(canvas);
        if (typeof G_vmlCanvasManager !== "undefined") {
            canvas = G_vmlCanvasManager.initElement(canvas);
        }
        context = canvas.getContext("2d"); 
        addEventListeners();
        document.addEventListener('deviceready', this.redraw, false);
    };
    
    return {
        init: init
    };
}());

var deviceMotion = (function() {
    // current sensor value
    var acc = { x:0, y:0, z:0 };
    var interval = 0;
        
    // movement
    var velocity = { x:0, y:0, z:0 };
    var position = { x:0, y:0, z:0 };
    
    var counter = 0;
    
    var x_0 = $V([acc.x, acc.y, acc.z]); //vector. Initial accelerometer values

    //P prior knowledge of state
    var P_0 = $M([  [1,0,0],
                    [0,1,0],
                    [0,0,1] ]); //identity matrix. Initial covariance. Set to 1
    var F_k = $M([  [1,0,0],
                    [0,1,0],
                    [0,0,1] ]); //identity matrix. How change to model is applied. Set to 1
    var Q_k = $M([  [0,0,0],
                    [0,0,0],
                    [0,0,0] ]); //empty matrix. Noise in system is zero

    var KM = new KalmanModel(x_0,P_0,F_k,Q_k);

    var z_k = $V([acc.x, acc.y, acc.z]); //Updated accelerometer values
    var H_k = $M([  [1,0,0], 
                    [0,1,0],    
                    [0,0,1] ]); //identity matrix. Describes relationship between model and observation
    var R_k = $M([  [2,0,0],
                    [0,2,0],
                    [0,0,2] ]); //2x Scalar matrix. Describes noise from sensor. Set to 2 to begin
                    
    var KO = new KalmanObservation(z_k,H_k,R_k);

    //each 1/10th second take new reading from accelerometer to update
    var calculate;
    
    var gravity = { x:0, y:0, z:0 };
    var alpha = 0.8;
    
    var init = function() {
        var handleMotion = function(e) {

          // Isolate the force of gravity with the low-pass filter.
          gravity.x = alpha * gravity.x + (1 - alpha) * e.acceleration.x;
          gravity.y = alpha * gravity.y + (1 - alpha) * e.acceleration.y;
          gravity.z = alpha * gravity.z + (1 - alpha) * e.acceleration.z;

          // Remove the gravity contribution with the high-pass filter.
          acc.x = e.acceleration.x - gravity.x;
          acc.y = e.acceleration.y - gravity.y;
          acc.z = e.acceleration.z - gravity.z;
                        
        /*  
            acc.x = e.acceleration.x;
            acc.y = e.acceleration.y;
            acc.z = e.acceleration.z;
        */
            
            interval= e.interval;
        }
                
        window.addEventListener("devicemotion", handleMotion, true);  

        calculate = window.setInterval(function(){
            KO.z_k = $V([acc.x, acc.y, acc.z]); //vector to be new reading from x, y, z
            KM.update(KO);
            calculatePosition();
            counter++;
            
             if(counter == 10) {      
                               
                var offsetValue = 0;
    
                if(position.x > 1000) {
                    offsetValue = 50;
                } else if (position.x < -1000) {
                    offsetValue = -50;
                }
                var event = new CustomEvent('moveCanvas', 
                    {
                        detail: {
                            offset: offsetValue
                        },
                        bubbles: true,
                        cancelable: true
                    });
                window.dispatchEvent(event);
                
                resetPosition();
                counter = 0;
            }                     
            
        }, 100);
    };

    var getAcceleration = function() {
        return {
            x : KM.x_k.elements[0],
            y : KM.x_k.elements[1],
            z : KM.x_k.elements[2]            
        }
    };
    
    var resetPosition = function() {
        acc = { x:0, y:0, z:0 };        
        position = { x:0, y:0, z:0 };        
        velocity = { x:0, y:0, z:0 };  
        interval = 0;
        
        resetKalmanModel();
    };
    
    var resetKalmanModel = function() {
        var x_0 = $V([acc.x, acc.y, acc.z]); //vector. Initial accelerometer values
    
        P_0 = $M([  [1,0,0], [0,1,0], [0,0,1] ]); //identity matrix. Initial covariance. Set to 1
        F_k = $M([  [1,0,0], [0,1,0], [0,0,1] ]); //identity matrix. How change to model is applied. Set to 1
        Q_k = $M([  [0,0,0], [0,0,0], [0,0,0] ]); //empty matrix. Noise in system is zero
        
        KM = new KalmanModel(x_0,P_0,F_k,Q_k);
        
        z_k = $V([acc.x, acc.y, acc.z]); //Updated accelerometer values
        H_k = $M([  [1,0,0], [0,1,0], [0,0,1] ]); //identity matrix. Describes relationship between model and observation
        R_k = $M([  [2,0,0], [0,2,0], [0,0,2] ]); //2x Scalar matrix. Describes noise from sensor. Set to 2 to begin
                    
        KO = new KalmanObservation(z_k,H_k,R_k);        
    }
    
    var calculatePosition = function(e) {        
        var acceleration = getAcceleration();
        
         var roundingFactor = 10;
        
        // update velocity            
        velocity.x += (Math.round(acceleration.x * roundingFactor)/roundingFactor) * interval;
        velocity.y += (Math.round(acceleration.y * roundingFactor)/roundingFactor) * interval;
        velocity.z += (Math.round(acceleration.z * roundingFactor)/roundingFactor) * interval;
        
        // update position
        position.x += velocity.x * interval;
        position.y += velocity.y * interval;
        position.z += velocity.z * interval;
        
        roundingFactor = 100;
        
        $('#output').text(Math.round(position.x * roundingFactor) / roundingFactor + " " 
                        + Math.round(position.y * roundingFactor) / roundingFactor + " " 
                        + Math.round(position.z * roundingFactor) / roundingFactor);
    //  $('#output').text(Math.round(velocity[0]*100) / 100 + " " + Math.round(velocity[1]*100)/100 + " " + Math.round(velocity[2]*100)/100);
    };  

     var getVelocity = function() {
        return velocity;
    };
    
     var getPosition = function() {
        return position;
    };      
    
    return {
        init: init,
        getAcceleration: getAcceleration,
        getVelocity: getVelocity,
        getPosition: getPosition,
        resetPosition: resetPosition
    };
}());
