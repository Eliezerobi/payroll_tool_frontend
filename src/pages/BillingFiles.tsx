import {
  ExportBillableNotes,
  ImportBilledNotes,
  ImportMetDeductible,
  UploadMillinInvoices,
  BillingFileExport,
} from "@/pages/billingFiles";

const BillingFiles = () => {
  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 p-6">
      <BillingFileExport />
      <ExportBillableNotes />
      <ImportBilledNotes />
      <ImportMetDeductible />
      <div className="xl:col-span-2">
        <UploadMillinInvoices />
      </div>
    </div>
  );
};

export default BillingFiles;
