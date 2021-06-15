#!perl
use warnings;
use strict;
use JSON;
use CGI qw(:cgi);
use CGI::Carp qw(fatalsToBrowser);
use Gnu::TinyDB;

my @ROUTES = (
   {method => "GET" , resource => "invoices"  , fn => \&GetInvoices},
   {method => "GET" , resource => "invoice"   , fn => \&GetInvoice },
   {method => "GET" , resource => "scanstatus", fn => \&GetStatus  },
   {method => "POST", resource => "scanstatus", fn => \&PostStatus },
   {method => "GET" , resource => "dates"     , fn => \&GetDates   },
   {method => "GET" , resource => "markets"   , fn => \&GetMarkets },
);

MAIN:
   Connection("samples");
   Route();
   exit(0);

sub Route {
   my $method = $ENV{REQUEST_METHOD} || "";
   my $path   = $ENV{PATH_INFO}      || "";

   foreach my $route (@ROUTES) {
      next unless $method =~ /$route->{method}/i;
      my ($resource, $id) = $path =~ /^\/(\w+)\/?(\d+)?/;
      next unless $resource =~ /$route->{resource}/i;
      return &{$route->{fn}}($id);
   }
   ReturnText("Unknown Route $method $path");
}

sub GetInvoices {
   my $match = param("match")   || "";
   my $date  = param("date")    || "";
   my $market= param("market")  || "";
   my $col = ($match =~ /^\d{4}-[\d-]+$/) ? "GenDate" : "InvoiceNumber";
   my $sql = "select Id,InvoiceNumber,GenDate,Market,BillType,ComputerName,BalanceForward,CurrentCharges,TotalDue,Therms,ChargeCount,Arrangement" .
             " from InvoiceXml where $col like '%$match%'";
   $sql .= " and gendate = '$date'" if ($date);
   $sql .= " and market = '$market'" if ($market);
   $sql .= " order by InvoiceNumber";

   my $invoices = FetchArray($sql);
   ReturnJSON($invoices);
}

sub GetInvoice {
   my ($id) = @_; 
   my $xml = FetchColumn("select HM_XML from InvoiceXml where InvoiceNumber = ?", $id);
   $xml =~ s/\x{00a2}/c/mg;
   $xml =~ s/\r//mg;
   ReturnXML($xml);
}

sub GetStatus {
   my $json = FetchColumn("select json from scanstatus");
   print "Content-type: text/json\n\n";
   print $json;
}

sub PostStatus {
   my $json = PostData();
   ExecSQL("truncate scanstatus");
   ExecSQL("insert into scanstatus (json) values(?)", $json);
   ReturnText("OK");
}

sub GetDates {
   my $sql = "select DATE(GenDate) as date from InvoiceXML group by GenDate order by GenDate";
   my $dates = FetchArray($sql);
   ReturnJSON([map{$_->{date}} @{$dates}]);
}

sub GetMarkets {
   my $sql = "select DISTINCT(Market) as market from InvoiceXML";
   my $markets = FetchArray($sql);
   ReturnJSON([map{$_->{market}} @{$markets}]);
   #ReturnJSON(["GA", "FL"]);
}

sub ReturnJSON {
   my ($content) = @_;
   print "Content-type: text/json\n\n";
   print to_json($content);
}

sub ReturnXML {
   my ($content) = @_;
   print "Content-type: text/xml, application/xml\n\n";
   print $content;
}

sub ReturnText {
   my ($content) = @_;
   print "Content-type: text/plain; charset=us-ascii\n\n";
   print $content;
}

sub PostData {
   local $/ = undef;
   my $data = <STDIN>;
   return $data;
}
