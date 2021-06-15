// Handler for viewing an index of generated invoice samples
// optional url params:
//   date=2020-09-08
//   market=GA
//   type=InfiniteAdvanceInvoice
//   status=credit
//
// ex: /invoices/all.html?type=InfiniteAdvanceInvoice&date=2020-09-08&status=credit

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
      self.input = $(".search");
      self.dates = $(".dates");
      self.markets = $(".markets");
      self.invoices = [];
      self.currentRow = 0;
      self.match = "";
      self.input
         .focus(function() {$(this).addClass('focus')   })
         .blur(function()  {$(this).removeClass('focus')})
         .change(self.KeyUp)
         .keyup(self.KeyUp);
      self.dates.change(self.DateChange);
      self.markets.change(self.StateChange);
      $(".typechecks span").click(self.TypeCheckChange);
      $(".statechecks span").click(self.StateCheckChange);
      $("table").on("click", "a"    , self.LinkClicked);
      $("table").on("click", ".clip", self.CopyToClipboard);
      $(".header h1").on("click", "span", self.EasterEgg);
      $(window).keydown(self.KeyDown);

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

   this.LinkClicked = function(e){
      let target = $(e.currentTarget);
      let name = target.text();
      if (!name.match(/preview|pdf/i)) return;
      e.preventDefault();
      let href = target.attr("href");
      if (name.match(/preview/i)) href += "&embed=1";
      $("iframe").attr("src", href);

      self.currentRow = target.closest("tr").index();      
      self.currentCol = target.index();
   };

   this.Load = async function() {
      self.ShowSpinner(1);
      self.InitType();
      self.InitState();
      await self.SetMarkets();
      await self.SetDates();
      await self.MakeIndex();
      await self.SetMatch();
      self.ShowSpinner(0);
   };

   this.InitType = function() {
      let type = self.UrlParam("type", "all");
      $(`.typechecks span[data-type='${type}']`).addClass("active");
      self.typechecks = [type];
   };

   this.InitState = function() {
      let state = self.UrlParam("status", "all");
      $(`.statechecks span[data-state='${state}']`).addClass("active");
      self.statechecks = [state];
   };

   this.SetDates = async function() {
      let response = await fetch(`${self.urlRoot}/dates`);
      let dates = await response.json();

      self.dates.html($("<option>").attr("value", "").text("All dates"));
      for (let date of dates) {
         self.dates.append($("<option>").attr("value", date).text(date));
      }
      // -- this will select thew most recent date --
      // let idx = dates.length + 1;
      // self.select.find(`:nth-child(${idx})`).prop('selected', true);

      let date = self.UrlParam("date", "");
      if (date) self.dates.find("option[value='" + date + "']").prop('selected', true);
   };

   this.SetMarkets = async function() {
      let response = await fetch(`${self.urlRoot}/markets`);
      let markets = await response.json();

      self.markets.html($("<option>").attr("value", "").text("All markets"));
      for (let market of markets) {
         self.markets.append($("<option>").attr("value", market).text(market));
      }
      let market = self.UrlParam("market", "");
      if (market) self.markets.find("option[value='" + market + "']").prop('selected', true);
   };

   this.SetMatch = async function() {
      let match = self.UrlParam("match", "");
      if (match) self.input.val(match);
      return match;
   }

   this.DateChange = async function() {
      self.ShowSpinner(1);
      await self.MakeIndex();
      self.ShowSpinner(0);
   };

   this.StateChange = async function() {
      self.ShowSpinner(1);
      await self.MakeIndex();
      self.ShowSpinner(0);
   };

   this.MakeIndex = async function() {
      $(".doctemplate").text((new Date()).toLocaleString());
      let date = self.dates.val();
      let market = self.markets.val();
      let url = `${self.urlRoot}/invoices?date=${date}&market=${market}`;
      let response = await fetch(url);
      self.invoices = await response.json();
      for (let invoice of self.invoices) {
         invoice.date = invoice.GenDate.split(" ")[0];
         invoice.bt   = self.MapType(invoice.BillType);
      }
      self.DisplayFilteredRows();
   };

   this.DisplayFilteredRows = function() {
      self.rows.empty();
      
      let useDate = self.match.match(/^\d{4}\-.*$/);
      let regex = new RegExp("^" + self.match, "i");
      let added = 0;
      for (let invoice of self.invoices) {
         if (useDate  && !invoice.GenDate.match(regex)) continue;
         if (!useDate && !invoice.InvoiceNumber.match(regex)) continue;
         if (!self.PassesTypeChecks(invoice)) continue;
         if (!self.PassesStateChecks(invoice)) continue;
         invoice.acct = invoice.InvoiceNumber.slice(0,-4);
         invoice.env = self.GetAdeptEnvironment(invoice.ComputerName);
         self.rows.append(self.Template("row", invoice));
         if (++added >= self.maxRows) break;
      }
      let msg = added >= self.maxRows ? `Displaying max ${added} rows` : `${added} rows`;
      $("tfoot td").text(msg);
   };

   this.MapType = function(type) {
      return type.match(/InfiniteAdvanceInvoice/ ) ? "A" :
             type.match(/IndividualBudgetInvoice/) ? "B" :
             type.match(/IndividualInvoice/      ) ? "I" :
             type.match(/GroupInvoice/           ) ? "G" :
                                                     "?" ;
   };

   // If we can detect the invoice was made in a non production env, link to non-prod adept
   this.GetAdeptEnvironment = function(name) {
      return name.match("GN00LTND8RS6PH2") ? "int"    :
             name.match("TEST-BILLER")     ? "preprod":
             name.match("##### todo ####") ? "preprod":
                                             "prod"   ;
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

   this.TypeCheckChange = function(event) {
      let el = $(event.target).toggleClass("active");
      let active = el.hasClass("active");
      let all = el.data("type") == "all";
      if (active && all) {
         $(".typechecks span").removeClass("active");
         el.toggleClass("active");
      }
      if (active && !all)
         $(".typechecks span:first-of-type").removeClass("active");

      self.typechecks = [];
      $(".typechecks span").each(function(i,el) {
         if ($(el).hasClass("active"))
            self.typechecks.push($(el).data("type"));
      });
      setTimeout(function() {self.Search(self.match)}, 0);
   }

   this.StateCheckChange = function(event) {
      let el = $(event.target).toggleClass("active");
      let active = el.hasClass("active");
      let all = el.data("state") == "all";
      if (active && all) {
         $(".statechecks span").removeClass("active");
         el.toggleClass("active");
      }
      if (active && !all)
         $(".statechecks span:first-of-type").removeClass("active");
      self.statechecks = [];
      $(".statechecks span").each(function(i,el) {
         if ($(el).hasClass("active"))
            self.statechecks.push($(el).data("state"));
      });
      setTimeout(function() {self.Search(self.match)}, 0);
   }

   this.PassesTypeChecks = function(invoice) {
      let test = self.typechecks.filter((type) => invoice.BillType.match(type) || type.match("all"));
      return test.length > 0;

      for (let type of checks) {
         if (invoice.BillType.match(type)) return true;
      };
   };

   this.PassesStateChecks = function(invoice) {
      if (self.statechecks.includes("all"))
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

   this.EasterEgg = function() {
      $('canvas').data("object").Enable(2);
   };

   this.KeyDown = function(event){
      switch(event.originalEvent.which){
         case 38: return self.SelectNext(event, -1); // up   - click link on prev row
         case 40: return self.SelectNext(event, 1);  // down - click link on next row
      }
   };

   this.SelectNext = function(event, direction){
      self.currentRow += direction;
      var rowcount = $(".index tbody tr").length;
      if (!rowcount) return;
      if (self.currentRow < 0) self.currentRow = rowcount - 1;
      if (self.currentRow >= rowcount) self.currentRow = 0;

      var cssRow = self.currentRow + 1;
      var cssCol = self.currentCol + 1;
      $(".index tbody tr:nth-child("+ cssRow +") td:nth-child(2) a:nth-child("+ cssCol +")").click();
      event.preventDefault();
   };

   this.Init();
}
