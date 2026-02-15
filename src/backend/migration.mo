import Map "mo:core/Map";
import Nat "mo:core/Nat";
import Time "mo:core/Time";

module {
  type Sex = {
    #male;
    #female;
    #unknown;
  };

  type Species = {
    #canine;
    #feline;
    #other;
  };

  type OldSurgeryCase = {
    id : Nat;
    mrn : Text;
    patientFirstName : Text;
    patientLastName : Text;
    dateOfBirth : Text;
    arrivalDate : Time.Time;
    species : Species;
    breed : Text;
    sex : Sex;
    presentingComplaint : Text;
    dischargeNotesComplete : Bool;
    pdvmNotified : Bool;
    labsComplete : Bool;
    histoComplete : Bool;
    surgeryReportComplete : Bool;
    imagingComplete : Bool;
    cultureComplete : Bool;
  };

  type ToDoItem = {
    id : Nat;
    description : Text;
    complete : Bool;
  };

  type NewSurgeryCase = {
    id : Nat;
    mrn : Text;
    patientFirstName : Text;
    patientLastName : Text;
    dateOfBirth : Text;
    arrivalDate : Time.Time;
    species : Species;
    breed : Text;
    sex : Sex;
    presentingComplaint : Text;
    dischargeNotesComplete : Bool;
    pdvmNotified : Bool;
    labsComplete : Bool;
    histoComplete : Bool;
    surgeryReportComplete : Bool;
    imagingComplete : Bool;
    cultureComplete : Bool;
    todos : [ToDoItem];
  };

  type OldActor = {
    nextId : Nat;
    cases : Map.Map<Nat, OldSurgeryCase>;
  };

  type NewActor = {
    nextId : Nat;
    nextToDoId : Nat;
    cases : Map.Map<Nat, NewSurgeryCase>;
  };

  public func run(old : OldActor) : NewActor {
    let newCases = old.cases.map<Nat, OldSurgeryCase, NewSurgeryCase>(
      func(_id, oldCase) {
        { oldCase with todos = [] };
      }
    );
    { old with nextToDoId = 0; cases = newCases };
  };
};
