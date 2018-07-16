export class inputPassword{

  public readonly type:string = "inputPassword";
  public readonly options:undefined;

  constructor(public readonly label : string,
              public readonly description: string) {
  };

  public static create(label: string, description: string) : inputPassword{
    return new inputPassword(label,description);
  };

}
