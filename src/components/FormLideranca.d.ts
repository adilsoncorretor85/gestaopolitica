import React from 'react';
import { Lideranca } from '../types';
interface FormLiderancaProps {
    lideranca?: Lideranca | null;
    onSave: (lideranca: Omit<Lideranca, 'id' | 'dataCadastro'>) => void;
    onCancel: () => void;
}
declare const FormLideranca: React.FC<FormLiderancaProps>;
export default FormLideranca;
