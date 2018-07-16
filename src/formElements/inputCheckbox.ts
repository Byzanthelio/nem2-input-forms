export class inputCheckbox{

  public readonly type:string = "inputCheckbox";

  constructor(public readonly label : string,
    public readonly description: string,
    public options: Array<string> = []) {

    };

    public static create(label: string, description: string, options: Array<string>=[]) : inputCheckbox{
      if(options.length>0){
        let previousOptions:Array<string> = new Array<string>();

        if(options.every(x=>{
          let i:boolean = !previousOptions.some(y=>y==x)
          previousOptions.push(x);
          return i;
        })){
          return new inputCheckbox(label,description,options);
        } else {
          throw new Error("Two or more options share the same label");
        };
      } else {
        return new inputCheckbox(label,description);
      };
    };

    public addOption(option: string) : void {
      if(this.options.every(x=>x!=option)){
        this.options.push(option);
      } else {
        throw new Error("New option is already being used in this element");
      };
      return;
    };

    public removeOption(option: string|number) : void {
      if(typeof option == "number"){
        if(this.options.length>option){
          this.options.splice(option,1);
        } else {
          throw new Error("An option could not be found at the given index");
        };
      } else {
        if(this.options.indexOf(option) > -1){
          this.options.splice(this.options.indexOf(option),1);
        } else {
          throw new Error("The option could not be found");
        };
      };
      return;
    };

    public newOptions(options: Array<string>) : void {
      if(options.length>0){
        let previousOptions:Array<string> = new Array<string>();

        if(options.every(x=>{
          let i:boolean = !previousOptions.some(y=>y==x)
          previousOptions.push(x);
          return i;
        })){
          this.options = options;
          return;
        } else {
          throw new Error("Two or more options share the same label");
        };
      }else{
        throw new Error("No new options were provided");
      };
    };

  }
