
declare namespace Scan {
  interface Static {
    init(variant: string): Promise<any>
    cmd(cmd: string): Promise<any>
    output(success: (msg: string) => void, err?: (err: string) => void): void
    exit(): Promise<any>
  }
}

declare const Scan: Scan.Static;
