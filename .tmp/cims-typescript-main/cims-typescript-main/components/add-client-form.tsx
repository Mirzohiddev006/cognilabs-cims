"use client";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface AdClientData {
  full_name: string;
  platform: string;
  username: string;
  phone_number: string;
  status: "contacted";
  assistant_name: string;
  notes: string;
}

export function AddClientFormSingleColumn() {
  const [formData, setFormData] = useState<AdClientData>({
    full_name: "",
    platform: "",
    username: "",
    phone_number: "",
    status: "contacted",
    assistant_name: "niki lauda",
    notes: "",
  });

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    console.log(`Field changed: ${name} = "${value}"`); // Debug log
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = () => {
    // Ensure all fields are included, converting undefined to empty string
    const dataToSubmit = {
      full_name: formData.full_name ?? "",
      platform: formData.platform ?? "",
      username: formData.username ?? "",
      phone_number: formData.phone_number ?? "",
      status: formData.status,
      assistant_name: formData.assistant_name ?? "", // Use nullish coalescing to handle undefined
      notes: formData.notes ?? "",
    };

    console.log("Form Data:", dataToSubmit);
    console.log("Raw formData before processing:", formData);

    // Here's where you'd typically send the data to your API
    // fetch('/api/clients', {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify(dataToSubmit)
    // });
  };

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl font-bold">Add New Client</CardTitle>
        <p className="text-sm text-gray-600">
          Fill in the client information below
        </p>
      </CardHeader>
      <CardContent>
        <div className="space-y-8">
          {/* Basic Information Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold border-b pb-2">
              Basic Information
            </h3>
            <div className="space-y-4">
              <div>
                <Label htmlFor="full_name" className="text-sm font-medium">
                  Full Name *
                </Label>
                <Input
                  id="full_name"
                  name="full_name"
                  value={formData.full_name}
                  onChange={handleChange}
                  required
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="phone_number" className="text-sm font-medium">
                  Phone Number *
                </Label>
                <Input
                  id="phone_number"
                  name="phone_number"
                  value={formData.phone_number}
                  onChange={handleChange}
                  required
                  className="mt-1"
                />
              </div>
            </div>
          </div>

          {/* Platform Information Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold border-b pb-2">
              Platform Information
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="platform" className="text-sm font-medium">
                  Platform *
                </Label>
                <Select
                  onValueChange={(value) =>
                    handleSelectChange("platform", value)
                  }
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select a platform" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="instagram">Instagram</SelectItem>
                    <SelectItem value="telegram">Telegram</SelectItem>
                    <SelectItem value="facebook">Facebook</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-500 mt-1">
                  Selected: {formData.platform || "None"}
                </p>
              </div>
              <div>
                <Label htmlFor="username" className="text-sm font-medium">
                  Username *
                </Label>
                <Input
                  id="username"
                  name="username"
                  value={formData.username}
                  onChange={handleChange}
                  required
                  className="mt-1"
                />
              </div>
            </div>
          </div>

          {/* Additional Information Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold border-b pb-2">
              Additional Information
            </h3>
            <div>
              <Label htmlFor="assistant_name" className="text-sm font-medium">
                Assistant Name
              </Label>
              <Input
                id="assistant_name"
                name="assistant_name"
                value={formData.assistant_name}
                onChange={handleChange}
                className="mt-1"
                placeholder="Enter assistant name"
              />
              <p className="text-xs text-gray-500 mt-1">
                Current value: &quot;{formData.assistant_name}&quot;
              </p>
            </div>
            <div>
              <Label htmlFor="notes" className="text-sm font-medium">
                Notes
              </Label>
              <Textarea
                id="notes"
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                rows={4}
                className="mt-1"
                placeholder="Add any additional notes about this client..."
              />
            </div>
          </div>

          {/* Debug section */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="font-medium mb-2">Current Form Data (Debug):</h4>
            <pre className="text-xs bg-white p-2 rounded border overflow-auto">
              {JSON.stringify(formData, null, 2)}
            </pre>
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <Button type="button" variant="outline" className="px-6">
              Cancel
            </Button>
            <Button type="button" onClick={handleSubmit} className="px-6">
              Add Client
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default AddClientFormSingleColumn;
