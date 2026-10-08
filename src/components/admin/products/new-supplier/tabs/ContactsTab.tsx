import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Trash2, UserPlus } from 'lucide-react';
import { type SupplierContact, CONTACT_ROLES } from '../types';
import { maskPhone } from '@/utils/masks';

const fieldClass = "mt-1.5 h-9";

interface ContactsTabProps {
  contacts: SupplierContact[];
  updateContact: (id: string, field: keyof SupplierContact, value: string) => void;
  addContact: () => void;
  removeContact: (id: string) => void;
}

function ContactCard({ contact, index, canRemove, updateContact, removeContact }: {
  contact: SupplierContact;
  index: number;
  canRemove: boolean;
  updateContact: ContactsTabProps['updateContact'];
  removeContact: ContactsTabProps['removeContact'];
}) {
  return (
    <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-3 relative">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-muted-foreground">Contato {index + 1}</span>
        {canRemove && <Button type="button" variant="ghost" size="sm" className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive" onClick={() => removeContact(contact.id)}><Trash2 className="h-3.5 w-3.5" /></Button>}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div><Label className="text-xs font-semibold">Função / Cargo</Label><Select value={contact.role} onValueChange={(value) => updateContact(contact.id, 'role', value)}><SelectTrigger className={`${fieldClass} w-full`}><SelectValue placeholder="Selecione..." /></SelectTrigger><SelectContent>{CONTACT_ROLES.map(role => <SelectItem key={role} value={role}>{role}</SelectItem>)}</SelectContent></Select></div>
        <div><Label className="text-xs font-semibold">Nome</Label><Input value={contact.name} onChange={(event) => updateContact(contact.id, 'name', event.target.value)} placeholder="Ex.: João" className={fieldClass} /></div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div><Label className="text-xs font-semibold">Assinatura</Label><Input value={contact.signature} onChange={(event) => updateContact(contact.id, 'signature', event.target.value)} placeholder="Ex.: Silva" className={fieldClass} /></div>
        <div><Label className="text-xs font-semibold">Apelido</Label><Input value={contact.nickname} onChange={(event) => updateContact(contact.id, 'nickname', event.target.value)} placeholder="Ex: Joãozinho" className={fieldClass} /></div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div><Label className="text-xs font-semibold">Telefone</Label><Input value={contact.phone} onChange={(event) => updateContact(contact.id, 'phone', maskPhone(event.target.value))} placeholder="(11) 99999-9999" className={fieldClass} maxLength={15} /></div>
        <div><Label className="text-xs font-semibold">E-mail</Label><Input type="email" value={contact.email} onChange={(event) => updateContact(contact.id, 'email', event.target.value)} placeholder="contato@fornecedor.com" className={fieldClass} /></div>
      </div>
    </div>
  );
}

export function ContactsTab({ contacts, updateContact, addContact, removeContact }: ContactsTabProps) {
  return (
    <div className="space-y-3 pt-3">
      <div className="flex items-center justify-between mb-1">
        <p className="text-xs text-muted-foreground">Adicione os contatos do fornecedor</p>
        <Button type="button" variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={addContact}>
          <UserPlus className="h-3.5 w-3.5" /> Adicionar Contato
        </Button>
      </div>
      <div className="space-y-3 max-h-[320px] overflow-y-auto pr-1">
        {contacts.map((contact, index) => <ContactCard key={contact.id} contact={contact} index={index} canRemove={contacts.length > 1} updateContact={updateContact} removeContact={removeContact} />)}
      </div>
    </div>
  );
}
