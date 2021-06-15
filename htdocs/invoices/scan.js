// Handler for viewing an validating invoice scan results
// This script is used by the generated file scan.html which was
// created using the invoice scanner InvoiceScanner.pl
//
// This handles multi user editing in a very simple way so don't
// expect much!   -Craig
//
$(function() {
   var manager = new ScanResultManager();
});

function ScanResultManager(){
   var self = this;

   this.Init = function(){
      $.fn.showIt = function(show) {
         return (show ? this.show() : this.hide());
      };
      self.urlRoot = "/cgi-bin/preview.pl/scanstatus";
      self.showFeedback = false;
      self.showAll = false;
      self.LoadStatus();
      $(".test").on("change", "input", self.InputChanged);
      $(".test").on("change", "textarea", self.InputChanged);
      $(".showall").on("change", "input", self.ShowAllChanged);
      $(".showfeedback").on("change", "input", self.ShowFeedbackChanged);
      $("a").click(self.LinkClicked)
   };

   this.LinkClicked = function(e){
      let el = $(e.currentTarget);
      let name = el.text();
      let href = el.attr("href");
      let clas = el.attr('class');
      if (!name.match(/preview|pdf/i) && !clas.match(/acct/)) return;
      e.preventDefault();
      if (clas && clas.match(/acct/)) {
         //href = href.replace('prod', 'preprod');
         return window.open(href, "_blank", 'location=yes,height=800,width=1520,scrollbars=yes,status=yes');
      }
      if (name.match(/preview/i)) href += "&embed=1";
      $("iframe").attr("src", href);
   };

   this.InputChanged = function(e){
      console.log("input changed");
      self.UpdateTestState($(e.currentTarget).closest(".test"));
      self.SaveStatus();
   };

   this.ShowFeedbackChanged = function(e){
      self.showFeedback = $(e.currentTarget).is(":checked");
      console.log("showfeedback: " , self.showFeedback);
      $(".statusinfo").showIt(self.showFeedback);
   };

   this.ShowAllChanged = function(e){
      self.showAll = $(e.currentTarget).is(":checked");
      console.log("showall: " , self.showAll);
      $(".test").each(function() {
         self.UpdateTestState($(this));
      });
   };

   this.LoadStatus = async function(){
      let response = await fetch(self.urlRoot);
      if (!response.ok) return console.log("problem loading status");
      let status = await response.json();
      self.ApplyStatus(status);
   };

   this.SaveStatus = async function(){
      let method = "post";
      let body = JSON.stringify(self.GatherStatus());
      let response = await fetch(self.urlRoot, {method, body});
      console.log(`status ${response.ok ? "saved!" : "save error"}`);
   };

   this.GatherStatus = function(){
      let status = {};
      $(".test").each(function() {
         let test = $(this);
         let name = $(this).data("name");
         let stat = {text: test.find("textarea").val()};
         ["billing", "marketing", "customer", "dev"].forEach((type) => {
            let radioname = `${type}_${name}`;
            stat[type] = test.find(`input[name="${radioname}"]:checked`).val();
         })
         status[name] = stat;
      });
      return status;
   };

   this.ApplyStatus = function(status){
      status = self.StatusDiff(status);
      for (let name in status) {
         let stat = status[name];
         let test = $(`.test[data-name="${name}"]`);

         for (let type in stat) {
            let val = stat[type];
            if (type == "text") {
               test.find("textarea").val(val);
            } else {
               let radioname = `${type}_${name}`;
               test.find(`input[name="${radioname}"]`).prop("checked", false).filter(`[value=${val}]`).prop("checked", true);
            }
         }
         self.UpdateTestState(test);
      }
      setTimeout(self.LoadStatus, 5000);
   };

   this.UpdateTestState = function(testNode){
      let problem=false, ok=true;
      testNode.find(".statusinforow").each(function() {
         let val = $(this).find("input:checked").val();
         problem |= (val == 2);
         ok &= (val == 1);
      })
      testNode.find("textarea").showIt(problem);
      testNode.showIt(!ok || self.showAll);
   };

   this.StatusDiff = function(status){
      if (!self.status) {
         return self.status = status;
      }
      let oldStatus = self.status;
      let newStatus = self.status = status;
      let diffStatus = {}

      for (let name in newStatus) {
         let newStat = newStatus[name];
         let oldStat = oldStatus[name];
         if (!oldStat) continue;
         ["billing", "marketing", "customer", "dev", "text"].forEach((type) => {
            self.AddIfDifferent(name, newStat, oldStat, diffStatus, type)
         });
      }
      self.DumpStatus(diffStatus);
      return diffStatus;
   };

   this.AddIfDifferent = function(name, newStat, oldStat, diffStatus, type) {
      if (newStat[type] == oldStat[type]) return;
      if (!(name in diffStatus)) diffStatus[name] = {};
      diffStatus[name][type] = newStat[type];
   };

   this.DumpStatus = function(status) {
      for (let name in status) {
         console.log(`[${name}]`);
         let stat = status[name];
         for (let type in stat) {
            let val = stat[type];
            console.log(`   ${type} => ${val}`);
         }
      }
   };

   this.Init();
}
