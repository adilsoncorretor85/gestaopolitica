import { PersonInsert, PersonUpdate, PeopleFilters, PaginatedResponse, PersonWithProfile } from '@/types';
export declare function getPeople(filters?: PeopleFilters): Promise<PaginatedResponse<PersonWithProfile>>;
export declare function createPerson(personData: PersonInsert): Promise<any>;
export declare function updatePerson(id: string, personData: PersonUpdate): Promise<any>;
export declare function deletePerson(id: string): Promise<void>;
export declare function getPerson(id: string): Promise<PersonWithProfile>;
export declare function normalizeWhatsApp(whatsapp: string): string;
export declare function formatWhatsApp(whatsapp: string): string;
export declare function getWhatsAppLink(whatsapp: string): string;
