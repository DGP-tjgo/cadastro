import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

type AdminAuthDialogProps = {
  open: boolean;
  onClose: () => void;
  onSuccess: () => Promise<void> | void; // ação que só admin pode executar
  title?: string;                        // ex.: "Autenticar para Exportar"
};

export default function AdminAuthDialog({ open, onClose, onSuccess, title = "Autenticação de Admin" }: AdminAuthDialogProps) {
  const [user, setUser] = useState("");
  const [pass, setPass] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // ⚠️ Checagem simples em front-end, apenas para este MVP
    const isValid = user === "admin" && pass === "Dgp@2025"; // senha contém um espaço inicial, conforme exigido
    if (!isValid) {
      toast.error("Usuário ou senha inválidos.");
      return;
    }

    try {
      setLoading(true);
      await onSuccess();
      onClose();
      setUser("");
      setPass("");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-2">
            <Label htmlFor="user">Usuário</Label>
            <Input
              id="user"
              value={user}
              onChange={(e) => setUser(e.target.value)}
              placeholder=''
              autoFocus
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="pass">Senha</Label>
            <Input
              id="pass"
              type="password"
              value={pass}
              onChange={(e) => setPass(e.target.value)}
              placeholder=''
            />
          </div>

          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Validando..." : "Entrar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
