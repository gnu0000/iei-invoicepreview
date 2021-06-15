//
// bubbles.js
//
// A canvas toy
// Craig Fitzgerald

$(function() {
   var scene = CreateFloatingBubbles($("canvas.bubbles").get(0));
});

// a sample scene - bubbles floating around and popping
//
function CreateFloatingBubbles(canvas){
   return new BubbleScene(canvas, {
      bubbleCount:  50,
      
      bubbleInitFn: function(bubble,i){
         bubble.dr     = ((Math.random()*2-1));
         bubble.dx     = ((Math.random()*80)-40)/10.0;
         bubble.dy     = ((Math.random()*80)-40)/10.0;
         bubble.radius = Math.random()*20 + 10;      
         bubble.xpos   = Math.random() * canvas.width; 
         bubble.ypos   = (bubble.dy>0 ? -bubble.radius : canvas.height + bubble.radius);
         if (bubble.dy<0.05 && bubble.dy>-0.05) bubble.dy=1;
         },
      drawBubbleFn: function(bubble){
         bubble.Draw(bubble.ctx, bubble.xpos, bubble.ypos, bubble.radius);
      },
      updateBubbleFn: function(bubble){
         bubble.xpos   += bubble.dx;
         bubble.ypos   += bubble.dy;
         bubble.radius += bubble.dr;
      },
      bubbleIsGoneFn: function(bubble){
         return (bubble.xpos > canvas.width  + bubble.radius ||
                 bubble.ypos > canvas.height + bubble.radius ||
                 bubble.xpos < 0             - bubble.radius ||
                 bubble.ypos < 0             - bubble.radius ||
                 bubble.radius <= 0                          ||
                 bubble.radius > 60                          );
      }
   });
};

var BUBBLE_COUNT    = 400;
var BUBBLE_RADIUS   = 15;
var UPDATE_INTERVAL = 40;

function BubbleScene(canvas, options){
   var self = this;

   this.Init = function(canvas, options){
      self.InitAttributes(canvas, options);
   };
   
   this.InitAttributes = function(canvas, options){
      self.bubbles     = [];
      self.canvas      = canvas;
      self.ctx         = canvas.getContext('2d');
      self.initialized = 0;
      
      $(canvas).data('object', self);
      
      var defaults = {
         bgColor0:          "#093052", 
         bgColor1:          "#3C6184",
         bubbleCount:       BUBBLE_COUNT,
         bubbleRadius:      BUBBLE_RADIUS,
         center:            {x:0, y:0, z:1000},
         animationInterval: UPDATE_INTERVAL,
         animationIncrement:(Math.PI * UPDATE_INTERVAL) / 8000,
         startRange:        {dmin: 0, dmax:800, ymin:-200, ymax: 200, tmin:0, tmax: Math.PI * 2},
         keepSorted:        1,
         offsetCamera:      0
      };
      self.options = $.extend(defaults, options || {});
      
      self.Draw         = self.options.drawFn         || self.DefaultDraw;
      self.CreateBubbles= self.options.createBubblesFn|| self.DefaultCreateBubbles;
      self.CreateBubble = self.options.createBubbleFn || self.DefaultCreateBubble;
      self.BubbleInit   = self.options.bubbleInitFn   || self.DefaultBubbleInit;
      self.DrawBubble   = self.options.drawBubbleFn   || self.DefaultDrawBubble;
      self.UpdateBubble = self.options.updateBubbleFn || self.DefaultUpdateBubble;
      self.BubbleIsGone = self.options.bubbleIsGoneFn || self.DefaultBubbleIsGone;
   };
   
   this.InitState = function(){
      self.bkgGradient = self.ctx.createLinearGradient(0, 0, 0, canvas.height);
      self.bkgGradient.addColorStop(0, self.options.bgColor0);
      self.bkgGradient.addColorStop(1, self.options.bgColor1);
      self.CreateBubbles();
   };
   

   // 0=disable 1=enable 2=toggle
   this.Enable = function (enable){
      if (self.initialized == 0){
         self.InitState ();
         self.initialized = 1;
      }
      if ((enable == 0 || enable == 2) && self.interval) {
         clearInterval(self.interval);
         self.interval = null;
         self.DrawBackground();
         $(canvas).hide();
      } else if ((enable == 1 || enable == 2) && !self.interval) {
         $(canvas).show();
         self.interval = setInterval(self.Draw, self.options.animationInterval);
      }
   };

   this.DefaultCreateBubbles = function (){
      for (var i=0; i<self.options.bubbleCount; i++){
         var bubble = self.CreateBubble(i);
         self.bubbles.push(bubble);
         self.BubbleInit(bubble,i);
      }
   };

   this.DefaultCreateBubble = function (i) {
      var bubble       = new Bubble(self.ctx, self.options.bubbleRadius);
      bubble.d         = self.options.startRange.dmin + Math.random() * (self.options.startRange.dmax - self.options.startRange.dmin);
      bubble.y         = self.options.startRange.ymin + Math.random() * (self.options.startRange.ymax - self.options.startRange.ymin);
      bubble.theta     = self.options.startRange.tmin + Math.random() * (self.options.startRange.tmax - self.options.startRange.tmin);
      bubble.increment = self.options.bubbleIncrement || (Math.PI * self.options.animationInterval) /8000;
      return bubble;
   };
   
   this.DefaultBubbleInit = function (bubble,i) {};

   this.DefaultDraw = function () {
      self.DrawBackground();

      if(self.options.keepSorted){
         self.bubbles.sort(function(a,b){
            return Math.cos(b.theta) * b.d  - Math.cos(a.theta) * a.d;
         });
      };

      for (i=0; i < self.bubbles.length; i++){
         var bubble = self.bubbles[i];
         self.DrawBubble  (bubble);
         self.UpdateBubble(bubble);

         if (self.BubbleIsGone(bubble)) {
            self.bubbles.splice(i, 1);
            bubble = self.CreateBubble(i);
            self.bubbles.unshift(bubble);
            self.BubbleInit(bubble,i);
            delete bubble;               
         }
      }
   };   

   this.DrawBackground = function () {
      self.ctx.fillStyle = self.bkgGradient;
      self.ctx.fillRect(0, 0, self.canvas.width, self.canvas.height);
   };

   this.DefaultDrawBubble = function (bubble) {
      var xpos   = Math.sin(bubble.theta) * bubble.d + self.options.center.x;
      var ypos   = bubble.y;
      var zpos   = Math.cos(bubble.theta) * bubble.d + self.options.center.z;
      var radius = bubble.radius;

      if (self.options.offsetCamera){
         ypos += Math.cos(bubble.theta) * bubble.d /20;
      };

      // map 3d coordinates to 2d camera view
      var vx = (xpos  / zpos) * 1000 + self.canvas.width/2;
      var vy = (ypos  / zpos) * 1000 + self.canvas.height/2;
      var vr = (radius/ zpos) * 1000;

      bubble.Draw(self.ctx, vx, vy, vr);
   };

   this.DefaultUpdateBubble = function (bubble){
      bubble.theta += bubble.increment;
   };

   this.DefaultBubbleIsGone = function (bubble){
      return 0;
   };

   this.Init(canvas, options);
};



function Bubble(ctx,radius) {
   var self = this;

   this.Init = function(ctx,radius) {
      self.ctx    = ctx;
      self.radius = radius;
      self.color  = self.HSVToRGB (_x(Math.random()), 192, 255, 0.5);
   };

   this.Draw = function (ctx,xpos,ypos,radius) {
      var gradient = ctx.createRadialGradient(xpos + radius/4, ypos - radius/4, radius/5, xpos, ypos, radius);
      gradient.addColorStop(0,    '#fff'           );
      gradient.addColorStop(0.85, self.color       );
      gradient.addColorStop(1,    'rgba(0,0,128,0)');
      ctx.fillStyle = gradient;

      ctx.fillRect(xpos-radius, ypos-radius, radius*2, radius*2);
   };

   // Ported countless times to countless languages. originally from povray
   // which I'm sure was ported from something else
   this.HSVToRGB = function (h, s, v, o) {
      var dh = h / 255 * 6;
      var ds = s / 255    ;
      var dv = v / 255    ;

      var di = Math.floor(dh);
      var df = dh - di;

      var p1 = dv * (1 - ds);
      var p2 = dv * (1 - (ds * df));
      var p3 = dv * (1 - (ds * (1 - df)));

      var dr, dg, db;
      if      (di == 0) {dr = dv; dg = p3; db = p1}
      else if (di == 1) {dr = p2; dg = dv; db = p1}
      else if (di == 2) {dr = p1; dg = dv; db = p3}
      else if (di == 3) {dr = p1; dg = p2; db = dv}
      else if (di == 4) {dr = p3; dg = p1; db = dv}
      else if (di == 5) {dr = dv; dg = p1; db = p2}
      else              {dr = dg = db = 0}

      return 'rgba('+_x(dr)+','+_x(dg)+','+_x(db)+','+String(o)+')';
   }

   //private util fn
   function _x(i) {return String(Math.floor(i * 256));};

   this.Init(ctx,radius);
};


