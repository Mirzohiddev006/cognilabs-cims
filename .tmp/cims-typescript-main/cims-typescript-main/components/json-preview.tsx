"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function JsonPreview({
  title,
  data,
}: {
  title: string;
  data: unknown;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <pre className="max-h-80 overflow-auto rounded-md bg-muted p-4 text-xs">
          {JSON.stringify(data, null, 2)}
        </pre>
      </CardContent>
    </Card>
  );
}
