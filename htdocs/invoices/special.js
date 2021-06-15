//
// Handler for viewing an index of generated samples
// This script looks at all the files avaible at the target url "/invoices/samples/"
// and extracts some invoice info and builds a table of links to compare new and old invoices
//

$(function() {
   var viewer = new SampleIndexViewer();
});

function SampleIndexViewer(){
   var self = this;

   this.Init = async function(){
      self.urlRoot = "/invoices/specialsamples/";
      self.links = [];
      self.invoices = [];
      self.rows = {};

      self.StashTemplates();

      await self.FetchLinks();
      await self.FetchInvoices();
      self.GroupAndSort();
      self.Generate();
   };

   this.StashTemplates = function() {
      self.templates = {};
      $("template").each((i, node) => {
         node = $(node);
         self.templates[node.attr("id")] = node.detach();
      });
   };

   this.FetchLinks = async function() {
      let response = await fetch(self.urlRoot);
      let index = await response.text();
      $(index).find("a").each((i, link) => {
         var href = $(link).attr("href");
         if (href.match(/^(\d+)-new\.xml/i)) self.links.push(self.urlRoot + href);
      });
   }

   this.FetchInvoices = async function() {
      if (!self.links.length) return;
      self.invoices.push(await self.FetchXML(self.links.pop()));
      return self.FetchInvoices();
   };

   this.FetchXML = async function(link) {
      let response = await fetch(link);
      let data = await response.text();
      let parser = new DOMParser();
      return parser.parseFromString(data, "application/xml");
   };

   this.GroupAndSort = function() {
      let groups = {};

      for (xml of self.invoices) {
         xml = $(xml);
         let id =   $(xml).find("InvoiceDetails").attr("InvoiceNumber");
         let type = $(xml).find("DocumentInfo").attr("DocumentTemplate");
         if (!groups[type]) groups[type] = [];
         groups[type].push({id, type, xml});
      }
      for (type in groups) {
         groups[type] = groups[type].sort((a,b) => a.id - b.id);
      }
      self.groups = groups;
   };

   this.Generate = function() {
      for (let type of Object.keys(self.groups).sort()) {
         self.GenGroupHeader(type);
         self.groups[type].forEach(i => self.GenBlock(i));
      }
   };

   this.GenGroupHeader = function(label) {
      $(".index").append(self.Template("heading", {label}));
   };

   this.GenBlock = function(inv) {
      let root = self.urlRoot + inv.id;
      let entry2 = self.Template("entry", {root}, inv.xml)
      self.SpecialFixForBudgetBills(entry2, inv);
      $(".index").append(entry2);
   };

   this.SpecialFixForBudgetBills = function(entry, inv) {
      let docTemplate = self.EvalDescriptor("DocumentInfo @DocumentTemplate", inv.xml);
      if (docTemplate.match(/GeorgiaIndividualBudgetInvoice/i)) {
         let balanceForward = self.EvalDescriptor("InvoiceAmountSections BalanceForward @LevelAmount", inv.xml);
         entry.find(".summary tr:nth-child(1) td:nth-child(2)").text(balanceForward);

         let currentCharges = self.EvalDescriptor("InvoiceAmountSections CurrentCharges @LevelAmount", inv.xml);
         entry.find(".summary tr:nth-child(2) td:nth-child(2)").text(currentCharges);

         let amountDue = self.EvalDescriptor("InvoiceAmountSections TotalAmountDue @LevelAmount", inv.xml);
         entry.find(".summary tr:nth-child(3) td:nth-child(2)").text(amountDue);
      }
   };

   this.ParseType = function(xml, invoiceId) {
      let type = $(xml).find("DocumentInfo").attr("DocumentTemplate");
      self.rows[invoiceId].find("td:nth-child(4)").text(type);
   };

   this.UrlParam = function(name, defaultVal){
      let results = new RegExp('[\\?&]' + name + '=([^&#]*)').exec(window.location.href);
      if(results) return decodeURIComponent(results[1]);
      return defaultVal;
   };

   // {{}} for xml elements {} for data elements
   this.Template = function(name, data, xml) {
      let html = self.templates[name].html();
      html = html.replace(/{{.+?}}/g, (m) => {
         return self.EvalDescriptor(m.match(/{{(.+)}}/)[1], xml);
      });
      html = html.replace(/{.+?}/g, (m) => {
         return data[m.match(/{(.+)}/)[1]]
      });
      return $(html);
   };

   this.EvalDescriptor = function(descriptor, xmlDom) {
      let [sel, attr] = descriptor.split("@");
      if (sel) xmlDom = xmlDom.find(sel.trim());
      let text = xmlDom.attr(attr.trim()) || "";
      return text.replace(/\{\{(.*?)\}\}/, "[$1]");
   };

   this.Wait = function(delay) {
      return new Promise(r => setTimeout(r, delay));
   };

   this.Init();
}
