// Handler for viewing invoice xml as a document
//
// text interpolation variables:
// This translate xml node attributes to values
//
// {selector @attribute}
// examples: 
//   <div> {MailingAddress @AddressLine1} </div>
//   <span> {InvoiceAccountInfo Account @EmailAddress} </span>

$(function() {
   var viewer = new InvoiceViewer();
});

function InvoiceViewer(){
   var self = this;

   this.Init = function(){
      $.ajaxSetup({ cache: false });

      $("button").click(self.Clicked);
   };

   this.Clicked = function() {
      //let header = {Content-Type   application/json; charset=utf-8}
      let url = "POST https://packetgenerator-webapi.preprod.gainesville.infiniteenergy.com:443/services/CorMan/PacketGenerator.WebApi/render/packet/simple";
      let dataType = "application/json; charset=utf-8";
      let data = '<Document>  <DocumentInfo DocumentTemplate="GeorgiaIndividualInvoice" DocumentGUID="ecc80193-30a5-4556-ab1d-ecf469033014" DocumentGeneratedDate="12/20/2019" DocumentLanguage="en-US" />  <Invoice>    <PresentationInfo />    <CompanyInfo>      <Info CertificationNumber="" ContactLine1="" ContactLine2="" CompanyName="" CustomerServicePhone="Billing Inquires: 770-661-1870 (Atlanta/Local) / 1-877-342-5434 (Toll Free), Hours: 8-7 M-F" CustomerServiceHours="For Emergencies (24 hours a day): AGLC 1-877-427-4321 (toll free), 770-907-4231" FacebookLink="" TwitterLink="" WebsiteLink="" EmergencyPhone="" Email="" />    </CompanyInfo>    <InvoiceInfo>      <InvoiceDetails InvoiceNumber="60570946831912" BillDate="12/21/2019" DueDate="1/10/2020" />      <ContractInfo RateCode="Fixed" AgreementEndDate="09/30/2020" />      <UsageHistory MinValue="0" MaxValue="26">        <UsageHistoryDetail SortOrder="1" Quantity="0" ServiceMonthAndYear="10-10-2019" />        <UsageHistoryDetail SortOrder="2" Quantity="11" ServiceMonthAndYear="11-6-2019" />        <UsageHistoryDetail SortOrder="3" Quantity="23" ServiceMonthAndYear="12-21-2019" />      </UsageHistory>      <UsageInfo CurrentRead="" PreviousRead="" MeterMultiplier="" TotalUsage="" ServiceRateClass="" UnitOfMeasurement="" ServicePeriodBeginDate="December 2019" ServicePeriodEndDate="" Rate="" />      <OCRInfo OCRLine="020000000000605709468301102000000028723" />    </InvoiceInfo>    <InvoiceAccountInfo>      <Account AccountNumber="6057094683" GroupID="" AccountName="PAUL HAN" EmailAddress="paul.jax.han@gmail.com" Phone="" Fax="" />      <MailingAddress AddressLine1="Gwynn A. Brewer" AddressLine2="2500 PLEASANT HILL RD APT 803" AddressLine3="DULUTH, GA 30096-4173" ZipCode="30096-4173" />      <VendorAccountInfo>        <VendorAccount VendorName="AGLC" VendorLongName="" ExternalVendorAccountNumber="82273384" LocationIdentifier="374282426" InternalAccountNumber="" AccountName="PAUL HAN" Status="" AddressLine1="2500 Pleasant Hill Rd Apt 803" AddressLine2="Duluth, GA 30096-4173" AddressLine3="" ZipCode="30096-4173" />      </VendorAccountInfo>    </InvoiceAccountInfo>    <InvoiceAmountsInfo>      <InvoiceTotals TotalNewCharges="26.53" TotalPayments="-107.14" TotalAdjustments="-9.99" DepositBalance="0.00" DepositPayment="0.00" TotalDue="28.72" MinimumDue="28.72" />      <InvoiceAmountSections>        <PreviousBalance SortOrder="1" Description="Previous Balance" Amount="107.14" LevelAmount="" />        <PaymentsReceived SortOrder="1" Description="Payment Received" Amount="-107.14" LevelAmount="" />        <BalanceForward SortOrder="1" Description="Balance Forward" Amount="0.00" LevelAmount="" />        <CurrentCharges SortOrder="1" Description="Current Charges" Amount="26.53" LevelAmount="" />        <SubTotal SortOrder="1" Description="Subtotal" Amount="26.53" LevelAmount="" />        <DepositDue SortOrder="1" Description="Deposit Due" Amount="0.00" LevelAmount="" />        <TotalAmountDue SortOrder="1" Description="Total Due on or before 1/10/2020" Amount="28.72" LevelAmount="" />        <TaxAmounts SortOrder="1" Description="Taxes" Amount="2.19" LevelAmount="" />      </InvoiceAmountSections>      <CurrentDetailCharges SortOrder="0" LayoutColumn="" Description="" Amount="">        <ChargesHeading SortOrder="1" Description="Actual Charges" Amount="" />        <DetailCharge SortOrder="0" Description="   Gas Charges" ChargeDetails="" Amount="9.47" LevelAmount="" Quantity="" Rate="" ServiceBeginDate="" ServiceEndDate="" UnitOfMeasurement="" />        <DetailCharge SortOrder="0" Description="   AGLC Base Charges DECEMBER 2019" ChargeDetails="" Amount="21.10" LevelAmount="" Quantity="" Rate="" ServiceBeginDate="12/1/2019 12:00:00 AM" ServiceEndDate="" UnitOfMeasurement="" />        <DetailCharge SortOrder="10" Description="Other Fee/Courtesy Credit" ChargeDetails="" Amount="-9.99" LevelAmount="" Quantity="" Rate="" ServiceBeginDate="" ServiceEndDate="" UnitOfMeasurement="" />        <DetailCharge SortOrder="5" Description="Customer Service Fee" ChargeDetails="" Amount="5.95" LevelAmount="" Quantity="" Rate="" ServiceBeginDate="" ServiceEndDate="" UnitOfMeasurement="" />      </CurrentDetailCharges>    </InvoiceAmountsInfo>    <InvoiceMessages>      <AccountNotices SortOrder="0" Description="THE AMOUNT $28.72 WILL BE BILLED TO YOUR CREDIT CARD ON 1/10/2020." LineIdentifier="Recurring Payment Message" />      <LateFeeReminder SortOrder="0" Description="A LATE FEE WILL BE APPLIED TO ANY BALANCE UNPAID BY THE DUE DATE SPECIFIED ABOVE IN THE AMOUNT OF $10.00 OR 1.5% OF THE UNPAID BALANCE, WHICHEVER IS GREATER, AS PERMITTED BY THE GEORGIA PUBLIC SERVICE COMMISSION." LineIdentifier="" />      <ReturnedChecksReminder SortOrder="0" Description="A $30.00 FEE IS CHARGED FOR ALL RETURNED PAYMENTS" LineIdentifier="" />    </InvoiceMessages>    <ConstituentInfo>      <ConstituentAccountSummary SortOrder="1" VendorName="" VendorLongName="" ExternalVendorAccountNumber="" LocationIdentifier="" InternalAccountNumber="" AccountName="" Status="" AddressLine1="" AddressLine2="" AddressLine3="" ZipCode="" MeterNumber="001441396" ReadBeginDate="11/1/2019 12:00:00 AM" ReadEndDate="12/4/2019 12:00:00 AM" AgreementEndDate="" CurrentMeterRead="5781" PreviousMeterRead="5759" MeterMultiplier="" ReadAmount="22.0000" Usage="22.6000" Rate="0.419030" NewCharges="9.47" NumberOfDays="33" BTUFactor="1.0290" />      <ConstituentAccountChargeDetail SortOrder="1" VendorName="" VendorLongName="" ExternalVendorAccountNumber="" LocationIdentifier="" InternalAccountNumber="" AccountName="" Status="" AddressLine1="" AddressLine2="" AddressLine3="" ZipCode="" ReadSource="" ReadSourceOrder="" ReadBeginDate="" ReadEndDate="" ReadAmount="" Usage="" TierId="" UsageVolume="" ConversionFactor="" Rate="" CommodityCharge="" DeliveryAmount="" CSFeeAmount="" DMSFee="" SourcingFee="" EnhancedServicesFee="" DDDC="0.042025" PassThroughCharge="" DACCharge="" FGTFuelCharge="" LDCFuelCharge="" TaxAmount="" AdjustmentAmount="" TotalAmount="" NCTSRider="" />    </ConstituentInfo>  </Invoice></Document>';
      //$.post(url, body, self.ShowData, )


      $.ajax({
        type: "POST",
        url: url,
        data: data,
        success: self.ShowData,
        dataType: dataType
      });
   };

   this.ShowData = function (data) {
      console.log(data);
   };


   this.Init();
}
