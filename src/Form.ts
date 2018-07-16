import {
  Account,
  Address,
  AggregateTransaction,
  Deadline,
  NetworkType,
  PlainMessage,
  PublicAccount,
  TransferTransaction,
} from 'nem2-sdk';
import {inputText} from './formElements/inputText';
import {inputPassword} from './formElements/inputPassword';
import {inputCheckbox} from './formElements/inputCheckbox';
import {inputRadio} from './formElements/inputRadio';

export type formElements = inputText|inputPassword|inputRadio|inputCheckbox;

export class Form{

  public readonly delimiter:string = "~"

  public static create(creator: PublicAccount, name: string, description: string, editors: Array<Address> = [creator.address]) : Form {
    const formAccount: Account = Account.generateNewAccount(creator.address.networkType); //TODO: validate new account is empty
    const address: Address = formAccount.address;
    return new Form(creator,name,description,address,editors,creator.address.networkType);
  };

  constructor(public readonly creator: PublicAccount,
    public readonly name:string,
    public readonly description:string,
    public readonly address:Address,
    public readonly editors:Array<Address>,
    public readonly networkType:NetworkType,
    public content:Array<formElements>=[]) {

      if(creator.address.networkType!=networkType){
        throw new Error("Form address and Creator address are of different network types");
      };
      if(address.networkType!=networkType){
        throw new Error("Form address network type does not match Form networkType");
      };
      for(let i=0;i<editors.length;i++){
        if(editors[i].networkType!=networkType){
          throw new Error("Form address and Editor address are of different network types");
        };
      };
      if(content.length>0){
        let previousLabels:Array<string> = new Array<string>();

        if(!content.every(x=>{
          let i:boolean = !previousLabels.some(y=>y==x.label)
          previousLabels.push(x.label);
          return i;
        })){
          throw new Error("Two or more form elements share the same label");
        };
      };
    };

    public pushElement(element: formElements) : void {
      if(this.content.every(x=>x.label!=element.label)){
        this.content.push(element);
      } else {
        throw new Error("New form element label is already being used in this form");
      };
      return;
    };

    public popElement() : formElements|undefined {
      return this.content.pop();
    };

    public removeElement(element: formElements|number|string) : void {
      switch(typeof element){

        case "number":
        if(this.content.length > element){
          this.content.splice(<number>element,1);
        } else {
          throw new Error("The index specified is outside the range of the form content");
        };
        break;

        case "string":
        let labels:Array<string> = this.content.map(x=>x.label);
        let labelIndex:number = labels.indexOf(<string>element)
        if(labelIndex > -1){
          this.content.splice(labelIndex,1);
        } else {
          throw new Error("The element could not be found in the form");
        };
        break;

        default:
        let index:number = this.content.indexOf(<formElements>element);
        if(index > -1){
          this.content.splice(index,1);
        } else {
          throw new Error("The element could not be found in the form");
        };
        break;

      }
      return;
    };

    public newElements(elements: Array<formElements>) : void {

      if(elements.length==0){
        throw new Error("No new elements were provided");
      };

      let previousLabels:Array<string> = new Array<string>();

      if(elements.every(x=>{
        let i:boolean = !previousLabels.some(y=>y==x.label)
        previousLabels.push(x.label);
        return i;
      })){
        this.content = elements;
      } else {
        throw new Error("Two or more form elements share the same label");
      };
      return;
    };

    public  empty(): void {
      this.content = [];
    };

    public getElements() : Array<formElements>{
      return this.content;
    };

    public getElement(index: number) : formElements{
      return this.content[index];
    };

  };
