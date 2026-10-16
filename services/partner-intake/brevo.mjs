// Server-only Brevo transport for future partner inquiry notifications.
// No production endpoint or client-side import is configured.
const destination='alfinafashionkft@gmail.com';
const endpoint='https://api.brevo.com/v3/smtp/email';
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const email=/^[^\s@<>]+@[a-z0-9.-]+\.[a-z]{2,}$/i;
const inline=(v,max)=>typeof v==='string'&&v.length>0&&v.length<=max&&!/[\u0000-\u001f\u007f-\u009f]/u.test(v);

export function createBrevoNotifier({apiKey,verifiedSenderEmail,senderName='Kaftan Angelo',fetchImpl=fetch,timeoutMs=10000}={}){
  return async inquiry=>{
    if(typeof apiKey!=='string'||apiKey.length<16||!email.test(verifiedSenderEmail||'')||!inline(senderName,80))
      throw Error('notification_not_configured');
    if(!inquiry||!uuid.test(inquiry.inquiry_id||'')||!inline(inquiry.recipient_name,120)
      ||!inline(inquiry.company,160)||!email.test(inquiry.recipient_email||'')
      ||!inline(inquiry.category,40)||!['hu','en'].includes(inquiry.language)
      ||typeof inquiry.message!=='string'||inquiry.message.length>3000
      ||/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f-\u009f]/u.test(inquiry.message)
      ||typeof inquiry.phone!=='string'||inquiry.phone.length>40
      ||/[\u0000-\u001f\u007f-\u009f]/u.test(inquiry.phone))
      throw Error('invalid_notification');
    const content=[
      'Kaftan Angelo partner inquiry',
      'Reference: '+inquiry.inquiry_id,
      'Name: '+inquiry.recipient_name,
      'Company: '+inquiry.company,
      'Email: '+inquiry.recipient_email,
      'Phone: '+inquiry.phone,
      'Category: '+inquiry.category,
      'Language: '+inquiry.language,
      '', 'Message:', inquiry.message
    ].join('\n');
    const payload={
      sender:{name:senderName,email:verifiedSenderEmail},
      to:[{email:destination}],
      subject:'Kaftan Angelo | New partner inquiry',
      textContent:content
    };
    let response;
    try{
      response=await fetchImpl(endpoint,{
        method:'POST',
        headers:{
          Accept:'application/json','Content-Type':'application/json',
          'api-key':apiKey,'idempotencyKey':inquiry.inquiry_id
        },
        body:JSON.stringify(payload),redirect:'error',
        signal:AbortSignal.timeout(timeoutMs)
      });
    }catch{throw Error('delivery_unconfirmed');}
    if(!response?.ok)throw Error('delivery_unconfirmed');
    let result;
    try{
      const raw=await response.text();
      if(raw.length>4096)throw Error();
      result=JSON.parse(raw);
    }catch{throw Error('delivery_unconfirmed');}
    if(typeof result?.messageId!=='string'||result.messageId.length<1||result.messageId.length>512)
      throw Error('delivery_unconfirmed');
    // Provider message acceptance is not proof of inbox delivery.
    // Idempotency behavior and expiry require real-provider verification.
    return {accepted:true};
  };
}
