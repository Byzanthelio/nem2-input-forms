# nem2-input-forms
## About ##
This library is for use with NEM2 (Catapult) blockchains (currently only MIJIN_TEST chain) for creating, recording and retrieving HTML input forms on the blockchain with the intention of allowing clients to find and submit to these forms securely and privately through, for example, their NEM wallet.
## Basic Implementation ##
A HTML input form consists of many input elements such as Text, Password, Radio Button and Checkbox elements. This protocol takes a user defined form template and converts it into a standard simplified string message. This message can then be sent to a new and 'empty' address on the NEM2 blockchain, in doing so defining the address as an input form. Clients may then view this form by retrieving the template from the form address through, for example, their secure NEM-enabled cryptowallet. Utilising this library the example wallet may display this form as a HTML input form which the client may then interact with. If a client wishes to submit to the form they can fill out the form and then their responses may be converted to a string message and sent to the form account address. A form account's transactions therefore will hold both the form and the responses by users. These are all public and viewable by anyone which may be appropriate in several instances however it is possible to create a form with private responses using encryption (not yet implemented).

## Usage ##
Currently this library can create, publish and retrieve basic forms on the MIJIN_TEST blockchain.
#### Creating Forms ####
```typescript
import { Form, inputText, inputRadio } from 'nem2-input-forms';
import { Account, NetworkType } from 'nem2-sdk';

const network = NetworkType.MIJIN_TEST;

const privateKey = <string>process.env.PRIVATE_KEY; //Form creator's private key
const account = Account.createFromPrivateKey(privateKey, network); //Form creator's account

let text = inputText.create("Text Element Name","Text Element Description"); //Text element

let radio = inputRadio.create("Radio Element Name","Radio Element Description"); //Radio Button Element
radio.addOption("Option A");
radio.addOption("Option B");
radio.addOption("Option C");

let newForm = Form.create(account.publicAccount,"My Form Name","My Form Description");
newForm.pushElement(text);
newForm.pushElement(radio);

console.log(newForm);
```
#### Publishing Forms ####
```typescript
import { FormService } from 'nem2-input-forms';
import { Account, NetworkType, TransactionHttp } from 'nem2-sdk';

const network = NetworkType.MIJIN_TEST;
const node = "http://localhost:3000" //MIJIN_TEST node

const transactionHttp = new TransactionHttp(node);

const privateKey = <string>process.env.PRIVATE_KEY; //Form creator's private key
const account = Account.createFromPrivateKey(privateKey, network); //Form creator's account

let newForm = /*See Creating Forms above*/

let publishableFormTransaction = FormService.publish(newForm); //creates an unsigned form definition transaction

transactionHttp
.announce(account.sign(publishableFormTransaction))
.subscribe(success => console.log('Form published'), (err:Error) => console.error("Form failed publishing: "+err));
```
#### Retrieving Forms and Building into HTML ####
```typescript
import { Form, FormService } from 'nem2-input-forms';
import { Account, NetworkType, AccountHttp, BlockHttp  } from 'nem2-sdk';

const network = NetworkType.MIJIN_TEST;
const node = "http://localhost:3000"; //MIJIN_TEST node

const accountHttp = new AccountHttp(node);
const blockHttp = new BlockchainHttp(node);

const formService = new FormService(accountHttp, blockHttp, network);

let formAddress = /*Form Address*/

formService.retrieveForm(formAddress).subscribe((form:Form) => {let newForm = form}, (err:Error) => console.error("FormService Error: "+err));
formService.buildForm(newForm);
```
