import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export interface SurgeryCase {
    id: bigint;
    mrn: string;
    sex: Sex;
    todos: Array<ToDoItem>;
    pdvmNotified: boolean;
    histoComplete: boolean;
    arrivalDate: Time;
    presentingComplaint: string;
    dateOfBirth: string;
    patientLastName: string;
    labsComplete: boolean;
    patientFirstName: string;
    imagingComplete: boolean;
    surgeryReportComplete: boolean;
    notes: string;
    dischargeNotesComplete: boolean;
    breed: string;
    species: Species;
    cultureComplete: boolean;
}
export type Time = bigint;
export interface ToDoItem {
    id: bigint;
    description: string;
    complete: boolean;
}
export enum Sex {
    female = "female",
    male = "male",
    unknown_ = "unknown"
}
export enum Species {
    other = "other",
    feline = "feline",
    canine = "canine"
}
export enum UserRole {
    admin = "admin",
    user = "user",
    guest = "guest"
}
export interface backendInterface {
    addTodoItem(caseId: bigint, description: string): Promise<bigint>;
    assignCallerUserRole(user: Principal, role: UserRole): Promise<void>;
    createCase(mrn: string, patientFirstName: string, patientLastName: string, dateOfBirth: string, species: Species, breed: string, sex: Sex, presentingComplaint: string, arrivalDate: Time | null, dischargeNotesComplete: boolean, pdvmNotified: boolean, labsComplete: boolean, histoComplete: boolean, surgeryReportComplete: boolean, imagingComplete: boolean, cultureComplete: boolean, notes: string, todoDescriptions: Array<string>): Promise<bigint>;
    deleteCase(id: bigint): Promise<void>;
    deleteTodoItem(caseId: bigint, todoId: bigint): Promise<void>;
    exportCases(): Promise<Array<SurgeryCase>>;
    getCallerUserRole(): Promise<UserRole>;
    getCase(id: bigint): Promise<SurgeryCase | null>;
    getCasesBySpecies(species: Species): Promise<Array<SurgeryCase>>;
    importCases(casesArray: Array<SurgeryCase>): Promise<void>;
    isCallerAdmin(): Promise<boolean>;
    listCases(): Promise<Array<SurgeryCase>>;
    toggleCulture(id: bigint): Promise<boolean>;
    toggleDischargeNotes(id: bigint): Promise<boolean>;
    toggleHisto(id: bigint): Promise<boolean>;
    toggleImaging(id: bigint): Promise<boolean>;
    toggleLabs(id: bigint): Promise<boolean>;
    togglePdvmNotified(id: bigint): Promise<boolean>;
    toggleSurgeryReport(id: bigint): Promise<boolean>;
    toggleTodoComplete(caseId: bigint, todoId: bigint): Promise<void>;
    updateCase(id: bigint, mrn: string, patientFirstName: string, patientLastName: string, dateOfBirth: string, arrivalDate: Time, species: Species, breed: string, sex: Sex, presentingComplaint: string, dischargeNotesComplete: boolean, pdvmNotified: boolean, labsComplete: boolean, histoComplete: boolean, surgeryReportComplete: boolean, imagingComplete: boolean, cultureComplete: boolean, notes: string, todos: Array<ToDoItem>): Promise<void>;
}
