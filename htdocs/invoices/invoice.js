// Handler for viewing invoice xml as a document
//
// text interpolation variables:
//   This translate xml node attributes to values {{selector @attribute}}
//   This translate object attribute to values {name}
//
// examples:
//   {{MailingAddress @AddressLine1}}
//   {{InvoiceAccountInfo Account @EmailAddress}}
//   {hide}

$(function() {
   var viewer = new InvoiceViewer();
});

function InvoiceViewer(){
   var self = this;

   this.Init = function(){
      $(".card .droptarget").on("dragover dragenter drop", self.ClearEvent);
      $(".card .droptarget").on("drop" , self.GetFromDrop);
      $(".card .fromurl"   ).on("click", self.GetFromUrl);
      $(".card .fromtext"  ).on("click", self.GetFromText);
      self.StashTemplates();
      $(".render").hide();
      self.HandleHeader();
      self.HandleUrl();
   };

   this.StashTemplates = function() {
      self.templates = {};
      $("template").each((i, node) => {
         node = $(node);
         self.templates[node.attr("id")] = node.detach();
      });
   };

   this.HandleHeader = function() {
      if (!self.UrlParam("embed", "")) return;
      $(".header").replaceWith(self.templates["miniheader"].html());
      $(".card").addClass("headergap");

      let href = window.location.href;
      $(".launch").attr("href", href.match(/(.*)&embed.*/)[1] || href);
   };

   this.HandleUrl = function() {
      let url = self.UrlParam("url", "");
      if (url && url.match(/\%/)) url = decodeURIComponent(url);
      if (url) return self.FetchInvoice(url);
      $(".source").show();
   };

   this.GetFromUrl = function() {
      self.FetchInvoice($(".source input").val().trim());
   };

   this.GetFromDrop = function(e) {
      let xfer = e.originalEvent.dataTransfer;
      if(xfer && xfer.files.length) self.UploadInvoice(xfer.files);
   };

   this.GetFromText = function() {
      let xmlText = $(".source textarea").val();
      xmlText = xmlText.replace(/^\s*{([\s\S]+)}\s*$/m, "$1"); //dev studio puts the text inside {}
      let parser = new DOMParser();
      let xmlDoc = parser.parseFromString(xmlText, "application/xml");
      self.RenderInvoice(xmlDoc);
   };

   this.FetchInvoice = async function(url) {
      let response = await fetch(self.url = url, {cache: "no-cache"});
      let xmlDoc = await response.text();
      self.RenderInvoice(xmlDoc);
   };

   this.UploadInvoice = function(files){
      let reader = new FileReader();
      reader.onload = (e) => {
         let xmlText = e.target.result.replace(/^\s*{([\s\S]+)}\s*$/m, "$1"); //dev studio puts the text inside {}
         let parser = new DOMParser();
         let xmlDoc = parser.parseFromString(xmlText, "application/xml");
         self.RenderInvoice(xmlDoc);
      }
      reader.readAsText(files[0]);
   };

   this.RenderInvoice = function(xmlDoc) {
      $(".source").hide();
      self.invoice = $(xmlDoc);
      if (self.XmlErrorCheck())
         return $(".render").show();

      self.market = self.invoice.find("DocumentInfo").attr("DocumentLanguageMarket").substr(-2).toLowerCase();
      self.docTemplate = self.EvalDescriptor("DocumentInfo @DocumentTemplate");

      self.Template();
      self.CreateUtilityInfo();
      self.CreateChargeDetailGroupsList();
      self.CreateFinalAmounts();
      self.CreateMessages();
      self.CreateRemittanceMessage();
      self.CreateConstituentTable();
      self.SpecialFixForBudgetBills();
      self.FinalTouchups();
      $(".render").show();
      $(".iconarea img").click(self.ToggleDebugView);
      $(".copy-acct").click(self.CopyAcctToClipboard);
      self.SetPageTitle();
   };

   this.LoadedInvoiceFail = function(error) {
      $(".card").empty().html("<h2>Error loading xml file:</h2><h3>"+self.url+"</h3>");
   };

   this.CreateUtilityInfo = function() {
      if (self.docTemplate.match(/Group/i)) 
         return;

      let[utilSel, meterSel] = [`utility-${self.market}`, `meterread-${self.market}`];

      $(".utility").append(self.Template(utilSel, null));
      let data = {
         meterNum:   self.invoice.find("ConstituentAccounts Account").attr("MeterNumber"),
         accountNum: self.invoice.find("VendorAccount").attr("ExternalVendorAccountNumber"),
         utility:    self.invoice.find("VendorAccount").attr("VendorName")
      };
      self.invoice.find("Charge").each((i, xmlDom) => {
         $(".meter table").append(self.Template(meterSel, data, $(xmlDom)));
      });
   };

   this.CreateChargeDetailGroupsList = function() {
      self.invoice.find("ChargeDetailGroups").each((i, xmlDom) => {
         let description = self.EvalDescriptor("@Description", $(xmlDom));
         let cdgs = $(self.Template("cdgs", {description}, self.invoice));
         self.CreateChargeDetailGroups(cdgs, $(xmlDom));
         cdgs.appendTo(".cdgslist");
      });
      $(`.days.${self.market}`).show();
   };

   this.CreateChargeDetailGroups = function(cdgs, xmlDom) {
      xmlDom.find("ChargeDetailGroup").each((i, xmlCdg) => {
         xmlCdg = $(xmlCdg);
         let hide = xmlCdg.attr("Title").match(/Debug/i) ? "hidden" : ""
         let cdg = self.Template("cdg", {hide}, xmlCdg);
         self.CreateChargeDetails(cdg, xmlCdg);
         cdgs.find(".chargedetailgroups").append(cdg);
      });
   };

   this.CreateChargeDetails = function(cdg, xmlDom) {
      let cdarea = cdg.find(".cdarea");
      xmlDom.find("ChargeDetail").each((i, xmlCd) => {
         cdarea.append(self.Template("cd", null, $(xmlCd)));
      })
   };

   this.CreateFinalAmounts = function() {
      let finalAmounts = $(".finalamounts");
      self.invoice.find("FinalAmount").each((i, xmlDom) => {
         finalAmounts.append(self.Template("finalamount", null, $(xmlDom)));
      });
   };

   this.CreateMessages = function() {
      let messages = $(".messages");
      self.invoice.find("Message").each((i, xmlDom) => {
         let loc = $(xmlDom).attr("Location") || "";
         let hide = loc.match(/Message Area/i) ? "" : "hidden";
         messages.append(self.Template("message", {hide}, $(xmlDom)));
      });
   };

   this.CreateRemittanceMessage = function() {
      let messages = $(".remittance");
      self.invoice.find("Message").each((i, xmlDom) => {
         let type = $(xmlDom).attr("Type") || "";
         let hide = type.match(/RemittanceMessage/i) ? "" : "hidden";
         messages.append(self.Template("message", {hide}, $(xmlDom)));
      });
   };

   this.CreateConstituentTable = function() {
      if (!self.docTemplate.match(/Group/i)) 
         return;
      $(".content .card").append(self.Template("constituents"));
      let ct = self.invoice.find("Charge").length;
      let idx = 0;
      self.invoice.find("ConstituentAccounts Account").each((i, xmlParentDom) => {
         $(xmlParentDom).find("Charge").each((i, xmlDom) => {
           let label = self.GenLabel(idx++, ct > 26);
           $(".constituents").append(self.Template("constituent", {label}, $(xmlDom), $(xmlParentDom)))
         });
      });
   };

   this.FinalTouchups = function() {
      if (self.invoice.find("InvoiceTotals").attr("DepositBalance") < 1)
         $(".deposit").addClass("hidden");

      var due = $(".summary tr:nth-child(4) td:nth-child(2)");
      if (due.text().match(/\-|0\.00/)) due.text("N/A");

      var bal = $(".summary tr:nth-child(3) td:nth-child(2)");
      if (bal.text().match(/\-/)) bal.text("0.00");

      if (self.docTemplate.match(/Group/i)) {
         $("li.aa").each((i, n) => {if ($(n).text() == "Adjustments: $") $(n).hide()});
         $("li.of").each((i, n) => {if ($(n).text() == "Other fees: $" ) $(n).hide()});
      }
   };

   this.SpecialFixForBudgetBills = function() {
      if (!self.docTemplate.match(/GeorgiaIndividualBudgetInvoice/i))
         return;
      let amountDue = self.EvalDescriptor("InvoiceAmountSections TotalAmountDue @LevelAmount");
      $(".summary tr:nth-child(4) td:nth-child(2)").text(amountDue);
      let balanceForward = self.EvalDescriptor("InvoiceAmountSections BalanceForward @LevelAmount");
      $(".summary tr:nth-child(3) td:nth-child(2)").text(balanceForward);
      let currentCharges = self.EvalDescriptor("InvoiceAmountSections CurrentCharges @Amount");
      $(".summary tr:nth-child(2) td:nth-child(2)").text(currentCharges);
      let currentLabel = self.EvalDescriptor("InvoiceAmountSections CurrentCharges @Description");
      $(".summary tr:nth-child(2) td:nth-child(1)").text(currentLabel+":");

      self.AddOtherCharges();
   };

   this.AddOtherCharges = function() {
      let otherCharges = self.EvalDescriptor("OtherCharges @Amount");
      if (otherCharges == 0) return;
      $(".cdgs:first-child").after(self.Template("othercharges", {otherCharges}));
   };

   this.SetPageTitle = function() {
      let invoiceNumber = self.EvalDescriptor("InvoiceDetails @InvoiceNumber");
      $("head title").text(invoiceNumber);
   };

   this.Template = function(name, data = {}, xml, parentXml = null) {
      let html = name ? self.templates[name].html() : $("body").html();
      html = html.replace(/{{.+?}}/g, (m) => {
         return self.EvalDescriptor(m.match(/{{(.+)}}/)[1], xml, parentXml)
      });
      html = html.replace(/{.+?}/g, (m) => {
         return data[m.match(/{(.+)}/)[1]]
      });
      if (!name) $("body").html(html);
      return $(html);
   };

   this.EvalDescriptor = function(descriptor, xmlDom = self.invoice, parentDom = null) {
      let [isParent, descr] = descriptor.split("..");  // test
      if (descr) xmlDom = parentDom;                   // test
      if (descr) descriptor = descr;                   // test

      let [sel, attr] = descriptor.split("@");
      if (sel.trim()) xmlDom = xmlDom.find(sel.trim());
      let text = xmlDom.attr(attr.trim()) || "";
      return text.replace(/\{\{(.*?)\}\}/, "[$1]");
   };

   this.XmlErrorCheck = function(){
      let err =
         !self.invoice.length                         ? "Invoice not found"                     :
         self.HasElement("parsererror"              ) ? self.invoice.find("parsererror").text() :
         self.HasElement("html"                     ) ? "This is an html file"                  :
         self.HasElement("ConstituentAccountSummary") ? "This file is an old XML version"       :
         self.HasElement("InvoiceDocuments"         ) ? "This file is a combined Invoices xml"  :
         !self.HasElement("Invoice"                 ) ? "This file not an Invoice xml"          :
                                                        "";
      if (err) return $(".render").empty().append($("<h2>").text(err));
      return false;
   };

   this.HasElement = function(name) {
      return self.invoice.find(name).length;
   };

   this.UrlParam = function(name, defaultVal){
      let results = new RegExp('[\\?&]' + name + '=([^&#]*)').exec(window.location.href);
      if(results) return decodeURIComponent(results[1]);
      return defaultVal;
   };

   this.GenLabel = function(idx, isBig){
      let label = "Location ";
      let high = Math.floor(idx / 26);
      let low  = idx % 26;

      if (isBig) label += String.fromCharCode(65 + high);
      label += String.fromCharCode(65 + low);
      return label;      
   }

   this.ClearEvent = function(e){
      e.preventDefault();
      e.stopPropagation();
   };

   this.ToggleDebugView = function(e){
      $("h3:contains('Debug')").closest(".cdg").toggleClass("hidden");
   };
      
   this.CopyAcctToClipboard = function(e){
      let a = $(event.target);

      a.addClass('flash');
      setTimeout(function() {a.removeClass('flash')}, 500);

      //let acct = a.text().match(/[0-9]+/)[0];
      let acct = a.data("text");
      console.log("text:", acct);

      const el = document.createElement('textarea');
      el.value = acct;
      el.setAttribute('readonly', '');
      el.style.position = 'absolute';
      el.style.left = '-9999px';
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
   };

   this.Init();
}
