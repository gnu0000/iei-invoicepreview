// Handler for viewing an index of generated invoice samples
//
$(function() {
   var viewer = new SampleIndexViewer();
});

function SampleIndexViewer(){
   var self = this;

   this.Init = function(){
      self.urlRoot = "/cgi-bin/preview.pl";
      self.maxRows = 300;
      self.searchDelay = 300;
      self.rows = $("#rows");
      self.input = $(".search input");
      self.select = $(".dates select");
      self.invoices = [];
      self.typechecks = ["alltypes"];
      self.statechecks = ["allstates"];
      self.match = "";

      self.input
         .focus(function() {$(this).addClass('focus')   })
         .blur(function()  {$(this).removeClass('focus')})
         .change(self.KeyUp)
         .keyup(self.KeyUp);
      self.select.change(self.DateChange);
      $(".typechecks input[type='checkbox']").change(self.TypeCheckboxChange);
      $(".statechecks input[type='checkbox']").change(self.StateCheckboxChange);
      $("table").on("click", ".clip", self.CopyToClipboard);
      self.StashTemplates();
      self.Load();
   };

   this.StashTemplates = function() {
      self.templates = {};
      $("template").each((i, node) => {
         node = $(node);
         self.templates[node.attr("id")] = node.detach();
      });
   };

   this.Load = async function() {
      self.ShowSpinner(1);
      await self.SetDates();
      await self.MakeIndex();
      self.ShowSpinner(0);
   };

   this.SetDates = async function() {
      let response = await fetch(`${self.urlRoot}/dates`);
      let dates = await response.json();

      self.select.html($("<option>").attr("value", "").text("All dates"));
      for (let date of dates) {
         self.select.append($("<option>").attr("value", date).text(date))
      }
      // -- this will select thew most recent date --
      // let idx = dates.length + 1;
      // self.select.find(`:nth-child(${idx})`).prop('selected', true);
   };

   this.DateChange = async function() {
      self.ShowSpinner(1);
      await self.MakeIndex();
      self.ShowSpinner(0);
   };

   this.MakeIndex = async function() {
      let date = $(".dates select").val();
      let url = `${self.urlRoot}/invoices?date=${date}`;
      let response = await fetch(url);
      self.invoices = await response.json();

      for (let invoice of self.invoices) {
         invoice.date = invoice.BillDate.split(" ")[0];
      }
      self.DisplayFilteredRows();
   };

   this.DisplayFilteredRows = function() {
      self.rows.empty();
      
      let useDate = self.match.match(/^\d{4}\-.*$/);
      let regex = new RegExp("^" + self.match, "i");
      let added = 0;
      for (let invoice of self.invoices) {
         if (useDate  && !invoice.BillDate.match(regex)) continue;
         if (!useDate && !invoice.InvoiceNumber.match(regex)) continue;

         if (!self.PassesTypeChecks(invoice)) continue;
         if (!self.PassesStateChecks(invoice)) continue;
         invoice.acct = invoice.InvoiceNumber.slice(0,-4);
         self.rows.append(self.Template("row", invoice));
         if (++added >= self.maxRows) break;
      }
      let msg = added >= self.maxRows ? `Displaying max ${added} rows` : `${added} rows`;
      $("tfoot td").text(msg);
   };

   this.NewLink = function(text, href) {
      return $("<a>", {target: "_blank", href}).text(text);
   };

   this.KeyUp = function (e) {
      self.match = $(this).val();
      if (self.timeout) clearTimeout(self.timeout);
      self.timeout = setTimeout(function() {self.Search(self.match); }, self.searchDelay);
   };

   this.Search = function (match) {
      self.ShowSpinner(1);
      self.DisplayFilteredRows();
      self.ShowSpinner(0);
   };

   this.TypeCheckboxChange = function(el) {
      let cb = $(el.target);
      let all = cb.val() == "alltypes" && cb.prop("checked");
      if (!all && $(".typechecks input[type='checkbox']:checked").length > 1)
         $("input[value='alltypes']").prop( "checked", false );

      self.typechecks = [];
      $(".typechecks input[type='checkbox']").each(function(i,el) {
         if ($(el).is(":checked"))
            self.typechecks.push($(el).val());
      })
      self.Search(self.match);
   }

   this.StateCheckboxChange = function(el) {
      let cb = $(el.target);
      let all = cb.val() == "allstates" && cb.prop("checked");
      if (!all && $(".statechecks input[type='checkbox']:checked").length > 1)
         $("input[value='allstates']").prop( "checked", false );

      self.statechecks = [];
      $(".statechecks input[type='checkbox']").each(function(i,el) {
         if ($(el).is(":checked"))
            self.statechecks.push($(el).val());
      })
      self.Search(self.match);
   }

   this.PassesTypeChecks = function(invoice) {
      let test = self.typechecks.filter((type) => invoice.BillType.match(type) || type.match("alltypes"));
      return test.length > 0;

      for (let type of checks) {
         if (invoice.BillType.match(type)) return true;
      };
   };

   this.PassesStateChecks = function(invoice) {
      if (self.statechecks.includes("allstates"))
         return true;
      if (self.statechecks.includes("pastdue") && invoice.BalanceForward > 0)
         return true;
      if (self.statechecks.includes("credit") && invoice.TotalDue < 0)
         return true;
      if (self.statechecks.includes("arrangement") && invoice.Arrangement)
         return true;
      return false;
   };

   this.CopyToClipboard = function(e) {
      let a = $(e.currentTarget).closest("tr").find(".acct");
      let invoicenum = a.text();
      a.text(invoicenum.slice(0,-4));
      let range = document.createRange();
      range.selectNode(a.get(0));
      getSelection().addRange(range);
      document.execCommand("copy");
      getSelection().empty();
      a.text(invoicenum);
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

   this.Template = function(name, data) {
      let html = self.templates[name].html();
      html = html.replace(/{.+?}/g, (m) => {
         return data[m.match(/{(.+)}/)[1]]
      });
      return $(html);
   };

   this.Init();
}
