// Handler for viewing an index of generated samples
// This script looks at all the files avaible at the target url "/invoices/samples/"
// and extracts some invoice info and builds a table of links to compare new and old invoices
// it's a quick and dirty hack, but we just need it to validate the new invoices.
//
$(function() {
   var viewer = new SampleIndexViewer();
});

function SampleIndexViewer(){
   var self = this;

   this.Init = function(){
      self.urlRoot = "/cgi-bin/preview.pl/invoices";
      self.searchMinLength = 1;
      self.searchDelay = 500;
      self.groups = {};
      self.input = $(".search input");

      self.input
         .focus(function() {$(this).addClass('focus')   })
         .blur(function()  {$(this).removeClass('focus')})
         .change(self.KeyUp)
         .keyup(self.KeyUp);

      self.StashTemplates();
      self.MakeIndex();
   };

   this.StashTemplates = function() {
      self.templates = {};
      $(".template").each((i, node) => {
         node = $(node);
         self.templates[node.data("id")] = node.removeClass("template").detach();
      });
   };

   this.MakeIndex = async function() {
      self.ShowSpinner(1);
      let response = await fetch(self.urlRoot);
      let invoices = await response.json();
      console.log(`loaded ${invoices.length} invoices`);
      self.BuildBlocks(invoices);
      self.ShowSpinner(0);
   };

   this.BuildBlocks = function(data) {
      for (var row of data) {
         let block = self.BuildBlock(row);
         self.AddBlock(block);
      }
   };

   this.BuildBlock = function(row) {
      row.dom = self.templates["block"].clone();
      row.dom.find(".InvoiceNumber").text(row.InvoiceNumber);
      return row;
   };

   this.AddBlock = function(block) {
      let type = block.BillType;
      let group = self.groups[type];

      if (group) return self._Add(group.block, block);
      self.groups[type] =  group = {dom: self.templates["group"].clone()};
      group.dom.find("h3").text(type);
      $(".index").append(group.dom);
      group.block = block;
      group.dom.after(block.dom);
   };

   this._Add = function(parent, child) {
      let cmp = parent.InvoiceNumber.localeCompare(child.InvoiceNumber);
      let lnk = cmp <= 0 ? "left" : "right";
      if (parent[lnk]) return self._Add(parent[lnk], child);
      parent[lnk] = child;
      parent.dom.after(child.dom);
   };

   this.KeyUp = function (e) {
      var input = $(this) || "";
      var text = input.val();

      if (text.length >= self.searchMinLength) {
         if (self.timeout) clearTimeout(self.timeout);
         self.timeout = setTimeout(function() {self.Search(text); }, self.searchDelay);
      }
   };

   this.Search = function (text) {
      self.ShowSpinner(1);
      for (type in self.groups){
         self.ShowIt(self.groups[type].block, new RegExp("^" + text, "i"));
      }
      self.ShowSpinner(0);
   };

   this.ShowIt = function(block, regex) {
      if (!block) return;
      block.InvoiceNumber.match(regex) ? block.dom.show() : block.dom.hide();
      self.ShowIt(block.left, regex);
      self.ShowIt(block.right, regex);
   };

   this.ShowSpinner = function(show) {
      let spinner = $(".spinner")
      show ? spinner.show() : spinner.hide();
   };

   this.UrlParam = function(name, defaultVal){
      let results = new RegExp('[\\?&]' + name + '=([^&#]*)').exec(window.location.href);
      if(results) return decodeURIComponent(results[1]);
      return defaultVal;
   };

   this.Init();
}
