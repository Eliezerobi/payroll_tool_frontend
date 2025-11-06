import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function ImportPatients() {
  return (
    <div className="p-6 flex justify-center">
      <Card className="w-full max-w-xl shadow-lg">
        <CardHeader>
          <CardTitle>Import Patients</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600 text-lg italic">
            🚧 This option will be coming soon.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
