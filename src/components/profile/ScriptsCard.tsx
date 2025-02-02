import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScriptsList } from "@/components/profile/ScriptsList";

interface Script {
  id: string;
  title: string;
  created_at: string;
}

interface ScriptsCardProps {
  scripts: Script[];
}

export function ScriptsCard({ scripts }: ScriptsCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>My Scripts</CardTitle>
        <CardDescription>
          Manage your scripts or create a new one
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ScriptsList scripts={scripts} />
      </CardContent>
    </Card>
  );
}