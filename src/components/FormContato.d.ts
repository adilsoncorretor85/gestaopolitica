import React from 'react';
import { Contato, Lideranca } from '../types';
interface FormContatoProps {
    contato?: Contato | null;
    liderancas: Lideranca[];
    onSave: (contato: Omit<Contato, 'id' | 'dataCadastro' | 'liderancaNome'>) => void;
    onCancel: () => void;
}
declare const FormContato: React.FC<FormContatoProps>;
export default FormContato;
