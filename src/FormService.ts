import {Form} from './Form';
import {
  AccountInfo,
  AccountHttp,
  Address,
  AggregateTransaction,
  BlockchainHttp,
  Deadline,
  NetworkType,
  PlainMessage,
  PublicAccount,
  TransactionType,
  TransferTransaction,
} from 'nem2-sdk';

import { Observable, pipe, of} from 'rxjs';
import { flatMap, map, filter} from 'rxjs/operators';

import {inputText} from './formElements/inputText';
import {inputPassword} from './formElements/inputPassword';
import {inputCheckbox} from './formElements/inputCheckbox';
import {inputRadio} from './formElements/inputRadio';
import {elementType} from './elementType';

type formElements = inputText|inputPassword|inputRadio|inputCheckbox;

export class FormService{

  constructor(private readonly accountHTTP: AccountHttp,
    private readonly blockchainHTTP: BlockchainHttp,
    private readonly networkType: NetworkType) {
    };

    public static readonly formId : string = "form";

    public retrieveForm(address:Address): Observable<Form> {
      let service = of(address);
      return service.pipe(
        this.getFormAccountInfo,
        this.getDefinitionBlockTransactions,
        this.validateFormDefinition(address),
        this.getForm,
        this.editForm
      );
    };

    public static publish(form : Form, deadline : Deadline = Deadline.create()) : AggregateTransaction {

      let editors:string = "{"+form.editors.map((x:Address)=>x.plain()).join(form.delimiter)+"}";

      const formHeader : TransferTransaction = TransferTransaction.create(
        deadline,
        form.address,
        [],
        PlainMessage.create([this.formId,form.name,form.description,editors].join(form.delimiter)),
        form.networkType
      );

      const formBody : TransferTransaction = TransferTransaction.create(
        deadline,
        form.address,
        [],
        PlainMessage.create(this.prepareMessage(form)),
        form.networkType
      );

      const innerTransactions = [formHeader.toAggregate(form.creator),formBody.toAggregate(form.creator)];

      const formTransaction = AggregateTransaction.createComplete(
        deadline,
        innerTransactions,
        form.networkType,
        [],
      );

      return formTransaction;
    }

    private static prepareMessage(form: Form): string {
      let formBody : Array<string> = new Array<string>();
      for(let i=0;i<form.content.length;i++){
        let element = form.content[i];
        let type: string = String(elementType[element.type as keyof typeof elementType]);
        let label: string = element.label;
        let description: string = element.description;
        let options:undefined|string;
        if(element.options){
          options = "{"+element.options.join(form.delimiter)+"}";
        };
        let msg: string = "{"+[type,label,description,options].filter(x=>!!x).join(form.delimiter)+"}";
        formBody.push(msg);
      };
      return "{"+formBody.join(form.delimiter)+"}";
    };

    private getFormAccountInfo =  flatMap((x:Address) => this.accountHTTP.getAccountInfo(x));

    private getDefinitionBlockTransactions = flatMap((x:any) => this.blockchainHTTP.getBlockTransactions((<AccountInfo><any>x).addressHeight.compact()));

    private validateFormDefinition = (address:Address) => map((x:any) => {
      let formTxn = x
      .filter((txn:any) => txn.type === TransactionType.AGGREGATE_COMPLETE)
      .map((txn:any) => <AggregateTransaction><any>txn)
      .filter((txn:AggregateTransaction) => !!txn.signer)
      .filter((txn:AggregateTransaction) => {
        return (txn.innerTransactions.length>1 && txn.innerTransactions.every(x=>(x instanceof TransferTransaction && x.recipient.equals(address))))
      })
      .filter((txn:AggregateTransaction) => {
        const formHeader:TransferTransaction = txn.innerTransactions[0] as TransferTransaction;
        const headerRegEx:RegExp = /^form([~,-])[a-zA-z0-9 ]+\1[a-zA-z0-9 ]+\1{[A-Z0-9]{40}(?:\1[A-Z0-9]{40})*}$/; //TODO: allow expressions other than alphanumeric excluding delimiter+form id
        return headerRegEx.test(formHeader.message.payload);
      })


      if(formTxn.length!==1){
        if(formTxn.length>1){
          throw new Error(`Address ${address.pretty()} has multiple form definitions`);
        } else {
          throw new Error(`Address ${address.pretty()} has no form definition`);
        };
      };

      return <AggregateTransaction>formTxn[0];

    });

    private getForm = map((x:AggregateTransaction) => {
      let headerTxn:TransferTransaction = <TransferTransaction>x.innerTransactions.shift();
      let bodyTxns:Array<TransferTransaction> = <Array<TransferTransaction>>x.innerTransactions;

      let creator:PublicAccount = x.signer || new PublicAccount(); //new PublicAccount should not be called
      let network:NetworkType = x.networkType;
      let address:Address = headerTxn.recipient;

      let headerMsg:string = <string>headerTxn.message.payload;
      let bodyMsg:string = bodyTxns.map((x:TransferTransaction)=>x.message.payload).join();

      let delimiter:string = headerMsg.charAt(FormService.formId.length);
      let bodyTest:RegExp = new RegExp("^{(?:{[0-9]+"+delimiter+"[a-zA-Z0-9 ]+"+delimiter+"[a-zA-Z0-9 ]+(?:"+delimiter+"{[a-zA-Z0-9 ]+(?:"+delimiter+"[a-zA-Z0-9 ]+)*})?}(?:"+delimiter+"(?={)|(?=}$)))+}$");

      if(!bodyTest.test(bodyMsg)){
        throw new Error("The form body content is not correctly defined");
      };

      let headerRegEx:RegExp = new RegExp(delimiter+"(?!(?:[A-Z]{40}["+delimiter+"}])+$)")
      let headerArray:Array<string> = headerMsg.split(headerRegEx);

      let version:string = headerArray[0] || "";
      let name:string = headerArray[1] || "";
      let description:string = headerArray[2] || "";
      let editors:Array<Address> = headerArray[3].slice(1,headerArray[3].length-1).split(delimiter).map(y => Address.createFromRawAddress(y));

      let bodyRegEx:RegExp = new RegExp("{[0-9]"+delimiter+"[a-zA-Z0-9 ]+"+delimiter+"[a-zA-Z0-9 ]+(?:"+delimiter+"{[a-zA-Z0-9 ]+(?:"+delimiter+"[a-zA-Z0-9 ]+)*})*}","g");
      let elementRegEx:RegExp = new RegExp(delimiter+"(?!(?:[a-z A-Z0-9 ]+"+delimiter+")*[a-z A-Z0-9 ]+})");

      let bodyArray:Array<Array<string>> = new Array<Array<string>>();
      let execArray: null|RegExpExecArray = null;

      while ((execArray=bodyRegEx.exec(bodyMsg)) !== null) {
        let elemString:string = execArray[0];
        elemString=elemString.slice(1,elemString.length-1);
        let elemParts:Array<string> = elemString.split(elementRegEx);
        if(elemParts.length>1){
          bodyArray.push(elemParts);
        };
      };

      let elementArray: Array<formElements> = new Array<formElements>()

      for(let i=0;i<bodyArray.length;i++){
        let newElement:Array<string> = bodyArray[i];
        let type:string = elementType[parseInt(newElement[0])]
        switch(type){

          case "inputText":
          if(newElement.length-1!=2){
            throw new Error(`inputText element has ${newElement.length-1} arguments. Expected 2.`);
          };
          let textElement:inputText = inputText.create(newElement[1],newElement[2]);
          elementArray.push(textElement);
          break;

          case "inputPassword":
          if(newElement.length-1!=2){
            throw new Error(`inputPassword element has ${newElement.length-1} arguments. Expected 2.`);
          };
          let passwordElement:inputPassword = inputPassword.create(newElement[1],newElement[2]);
          elementArray.push(passwordElement);
          break;

          case "inputRadio":
          if(newElement.length-1!=3){
            throw new Error(`inputRadio element has ${newElement.length-1} arguments. Expected 3.`);
          };
          let radioOptions:Array<string> = newElement[3].slice(1,newElement[3].length-1).split(delimiter);
          let radioElement:inputRadio = inputRadio.create(newElement[1],newElement[2],radioOptions);
          elementArray.push(radioElement);
          break;

          case "inputCheckbox":
          if(newElement.length-1!=3){
            throw new Error(`inputText element has ${newElement.length-1} arguments. Expected 3.`);
          };
          let checkboxOptions:Array<string> = newElement[3].slice(1,newElement[3].length-1).split(delimiter);
          let checkboxElement:inputCheckbox = inputCheckbox.create(newElement[1],newElement[2],checkboxOptions);
          elementArray.push(checkboxElement);
          break;

          default:
          throw new Error("The form element type could not be found");

        };
      };

      let form:Form = new Form(creator,name,description,address,editors,network,elementArray);

      return form;
    });

    private editForm = map((x:Form) => {
      return x;
    });

    public buildForm(form:Form) : string {
      let formString:string = `<form name="${form.name}"><br><br>${form.description}<br><br>`;
      for(let i=0;i<form.content.length;i++){
        let newElement:formElements = form.content[i];
        switch(newElement.type){

          case "inputText":
          formString+=`${newElement.description}<br><input type="text" name="${newElement.label}"><br><br>`
          break;

          case "inputPassword":
          formString+=`${newElement.description}<br><input type="password" name="${newElement.label}"><br><br>`
          break;

          case "inputRadio":
          formString+=`${newElement.description}<br>`;
          if(newElement.options){
            for(let j=0;j<newElement.options.length;j++){
              formString+=`<input type="radio" name="${newElement.label}" value="${j}">${newElement.options[j]}<br>`
            };
          };
          formString+=`<br>`;
          break;

          case "inputCheckbox":
          formString+=`${newElement.description}<br>`;
          if(newElement.options){
            for(let j=0;j<newElement.options.length;j++){
              formString+=`<input type="checkbox" name="${newElement.label}${j}" value="${j}">${newElement.options[j]}<br>`
            };
          };
          formString+=`<br>`;
          break;

        };
      };
      formString+="</form>";
      return formString;
    };

  };
