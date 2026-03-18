import { ExportBillableNotes, ImportBilledNotes, ImportMetDeductible } from "@/pages/billingFiles";

export default function BillingFilesPage() {
  return (
    <div className="h-full w-full bg-gray-100 p-6 flex flex-col gap-6">
      <ExportBillableNotes />
      <ImportBilledNotes />
      <ImportMetDeductible />
    </div>
  );
}
