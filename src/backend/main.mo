import Principal "mo:core/Principal";
import Text "mo:core/Text";
import Time "mo:core/Time";
import Array "mo:core/Array";
import Order "mo:core/Order";
import Map "mo:core/Map";
import Runtime "mo:core/Runtime";
import Nat "mo:core/Nat";
import AccessControl "authorization/access-control";
import MixinAuthorization "authorization/MixinAuthorization";
import Migration "migration";

(with migration = Migration.run)
actor {
  public type Sex = {
    #male;
    #female;
    #unknown;
  };

  public type Species = {
    #canine;
    #feline;
    #other;
  };

  public type ToDoItem = {
    id : Nat;
    description : Text;
    complete : Bool;
  };

  public type SurgeryCase = {
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
    notes : Text;
    todos : [ToDoItem];
  };

  var nextId = 0;
  var nextToDoId = 0;
  let cases = Map.empty<Nat, SurgeryCase>();

  let accessControlState = AccessControl.initState();
  include MixinAuthorization(accessControlState);

  module SurgeryCase {
    public func compare(a : SurgeryCase, b : SurgeryCase) : Order.Order {
      Nat.compare(a.id, b.id);
    };
  };

  public shared ({ caller }) func createCase(
    mrn : Text,
    patientFirstName : Text,
    patientLastName : Text,
    dateOfBirth : Text,
    species : Species,
    breed : Text,
    sex : Sex,
    presentingComplaint : Text,
    arrivalDate : ?Time.Time,
    dischargeNotesComplete : Bool,
    pdvmNotified : Bool,
    labsComplete : Bool,
    histoComplete : Bool,
    surgeryReportComplete : Bool,
    imagingComplete : Bool,
    cultureComplete : Bool,
    notes : Text,
    todoDescriptions : [Text],
  ) : async Nat {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can create cases");
    };
    nextId += 1;
    let id = nextId;

    let todos = todoDescriptions.map(
      func(desc) {
        nextToDoId += 1;
        {
          id = nextToDoId;
          description = desc;
          complete = false;
        };
      }
    );

    let caseRecord : SurgeryCase = {
      id;
      mrn;
      patientFirstName;
      patientLastName;
      dateOfBirth;
      arrivalDate = switch (arrivalDate) {
        case (?date) { date };
        case (null) { Time.now() };
      };
      species;
      breed;
      sex;
      presentingComplaint;
      dischargeNotesComplete;
      pdvmNotified;
      labsComplete;
      histoComplete;
      surgeryReportComplete;
      imagingComplete;
      cultureComplete;
      notes;
      todos;
    };

    cases.add(id, caseRecord);
    id;
  };

  public query ({ caller }) func getCase(id : Nat) : async ?SurgeryCase {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view cases");
    };
    cases.get(id);
  };

  public query ({ caller }) func listCases() : async [SurgeryCase] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can list cases");
    };
    cases.values().toArray().sort();
  };

  public shared ({ caller }) func updateCase(
    id : Nat,
    mrn : Text,
    patientFirstName : Text,
    patientLastName : Text,
    dateOfBirth : Text,
    arrivalDate : Time.Time,
    species : Species,
    breed : Text,
    sex : Sex,
    presentingComplaint : Text,
    dischargeNotesComplete : Bool,
    pdvmNotified : Bool,
    labsComplete : Bool,
    histoComplete : Bool,
    surgeryReportComplete : Bool,
    imagingComplete : Bool,
    cultureComplete : Bool,
    notes : Text,
    todos : [ToDoItem],
  ) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can update cases");
    };
    if (not cases.containsKey(id)) { Runtime.trap("Case does not exist") };
    let updatedRecord : SurgeryCase = {
      id;
      mrn;
      patientFirstName;
      patientLastName;
      dateOfBirth;
      arrivalDate;
      species;
      breed;
      sex;
      presentingComplaint;
      dischargeNotesComplete;
      pdvmNotified;
      labsComplete;
      histoComplete;
      surgeryReportComplete;
      imagingComplete;
      cultureComplete;
      notes;
      todos;
    };
    cases.add(id, updatedRecord);
  };

  public shared ({ caller }) func deleteCase(id : Nat) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can delete cases");
    };
    if (not cases.containsKey(id)) { Runtime.trap("Case does not exist") };
    cases.remove(id);
  };

  public shared ({ caller }) func toggleDischargeNotes(id : Nat) : async Bool {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can toggle checklist items");
    };
    let caseRecord = switch (cases.get(id)) {
      case (null) { Runtime.trap("Case does not exist") };
      case (?record) { record };
    };

    let newState = not caseRecord.dischargeNotesComplete;
    cases.add(id, { caseRecord with dischargeNotesComplete = newState });
    newState;
  };

  public shared ({ caller }) func togglePdvmNotified(id : Nat) : async Bool {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can toggle checklist items");
    };
    let caseRecord = switch (cases.get(id)) {
      case (null) { Runtime.trap("Case does not exist") };
      case (?record) { record };
    };

    let newState = not caseRecord.pdvmNotified;
    cases.add(id, { caseRecord with pdvmNotified = newState });
    newState;
  };

  public shared ({ caller }) func toggleLabs(id : Nat) : async Bool {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can toggle checklist items");
    };
    let caseRecord = switch (cases.get(id)) {
      case (null) { Runtime.trap("Case does not exist") };
      case (?record) { record };
    };

    let newState = not caseRecord.labsComplete;
    cases.add(id, { caseRecord with labsComplete = newState });
    newState;
  };

  public shared ({ caller }) func toggleHisto(id : Nat) : async Bool {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can toggle checklist items");
    };
    let caseRecord = switch (cases.get(id)) {
      case (null) { Runtime.trap("Case does not exist") };
      case (?record) { record };
    };

    let newState = not caseRecord.histoComplete;
    cases.add(id, { caseRecord with histoComplete = newState });
    newState;
  };

  public shared ({ caller }) func toggleSurgeryReport(id : Nat) : async Bool {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can toggle checklist items");
    };
    let caseRecord = switch (cases.get(id)) {
      case (null) { Runtime.trap("Case does not exist") };
      case (?record) { record };
    };

    let newState = not caseRecord.surgeryReportComplete;
    cases.add(id, { caseRecord with surgeryReportComplete = newState });
    newState;
  };

  public shared ({ caller }) func toggleImaging(id : Nat) : async Bool {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can toggle checklist items");
    };
    let caseRecord = switch (cases.get(id)) {
      case (null) { Runtime.trap("Case does not exist") };
      case (?record) { record };
    };

    let newState = not caseRecord.imagingComplete;
    cases.add(id, { caseRecord with imagingComplete = newState });
    newState;
  };

  public shared ({ caller }) func toggleCulture(id : Nat) : async Bool {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can toggle checklist items");
    };
    let caseRecord = switch (cases.get(id)) {
      case (null) { Runtime.trap("Case does not exist") };
      case (?record) { record };
    };

    let newState = not caseRecord.cultureComplete;
    cases.add(id, { caseRecord with cultureComplete = newState });
    newState;
  };

  public query ({ caller }) func getCasesBySpecies(species : Species) : async [SurgeryCase] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can query cases");
    };
    cases.values().toArray().sort().filter(
      func(caseRecord) {
        caseRecord.species == species;
      }
    );
  };

  public query ({ caller }) func exportCases() : async [SurgeryCase] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can export cases");
    };
    cases.values().toArray();
  };

  public shared ({ caller }) func importCases(casesArray : [SurgeryCase]) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can import cases");
    };
    for (caseRecord in casesArray.values()) {
      cases.add(caseRecord.id, caseRecord);
      if (caseRecord.id > nextId) {
        nextId := caseRecord.id;
      };
    };
  };

  public shared ({ caller }) func addTodoItem(caseId : Nat, description : Text) : async Nat {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can add to-do items");
    };
    let caseRecord = switch (cases.get(caseId)) {
      case (null) { Runtime.trap("Case does not exist") };
      case (?record) { record };
    };

    nextToDoId += 1;
    let todo : ToDoItem = {
      id = nextToDoId;
      description;
      complete = false;
    };

    let updatedTodos = caseRecord.todos.concat([todo]);
    cases.add(caseId, { caseRecord with todos = updatedTodos });
    todo.id;
  };

  public shared ({ caller }) func toggleTodoComplete(caseId : Nat, todoId : Nat) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can update to-do items");
    };
    let caseRecord = switch (cases.get(caseId)) {
      case (null) { Runtime.trap("Case does not exist") };
      case (?record) { record };
    };

    let updatedTodos = caseRecord.todos.map(
      func(todo) {
        if (todo.id == todoId) {
          { todo with complete = not todo.complete };
        } else {
          todo;
        };
      }
    );

    cases.add(caseId, { caseRecord with todos = updatedTodos });
  };

  public shared ({ caller }) func deleteTodoItem(caseId : Nat, todoId : Nat) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can delete to-do items");
    };
    let caseRecord = switch (cases.get(caseId)) {
      case (null) { Runtime.trap("Case does not exist") };
      case (?record) { record };
    };

    let updatedTodos = caseRecord.todos.filter(
      func(todo) {
        todo.id != todoId;
      }
    );

    cases.add(caseId, { caseRecord with todos = updatedTodos });
  };
};
