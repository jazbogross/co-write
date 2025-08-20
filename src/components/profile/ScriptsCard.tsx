
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScriptsList } from "@/components/profile/ScriptsList";
import { Script } from "@/types/repository";

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
