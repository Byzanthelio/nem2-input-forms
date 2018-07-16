export class inputText{

public readonly type:string = "inputText";
public readonly options:undefined;

constructor(public readonly label : string,
            public readonly description: string) {

};

public static create(label: string, description: string) : inputText{
  return new inputText(label,description);
};

}
