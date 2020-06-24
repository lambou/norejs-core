import Mailgen from "mailgen";

export declare type EmailNotificationConstructorType<
  Emails,
  TransportType,
  MailDataType
> = {
  generator: Mailgen.Option;
};

export default abstract class IEmailNotification<
  Emails,
  TransportType,
  MailDataType
> {
  protected mailGenerator: Mailgen;
  protected transport!: TransportType;

  email: Partial<Emails> = {};

  constructor(
    params: EmailNotificationConstructorType<
      Emails,
      TransportType,
      MailDataType
    >
  ) {
    this.mailGenerator = new Mailgen(params.generator);

    this.initTransport();
  }

  /**
   * Initialize transport within this method
   */
  protected initTransport(): void {}

  /**
   * Build a mail
   * @param mailContent Mail content
   */
  mail(
    mailContent: Mailgen.Content
  ): {
    text: string;
    html: string;
  } {
    return {
      text: this.mailGenerator.generatePlaintext(mailContent),
      html: this.mailGenerator.generate(mailContent),
    };
  }

  /**
   * Send mail with the transport
   * @param mailData mail data
   * @param callback callback
   */
  async sendMail(
    mailData: MailDataType,
    callback?: (error: any, info: any) => void
  ) {}
}
