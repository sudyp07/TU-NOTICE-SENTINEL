import nodemailer from "nodemailer";
export async function sendEmail({user,appPassword,to,subject,html,text}){if(!user||!appPassword||!to)throw Error("Missing email configuration: GMAIL_USER, GMAIL_APP_PASSWORD, EMAIL_TO");const t=nodemailer.createTransport({service:"gmail",auth:{user,pass:appPassword}});return t.sendMail({from:`"TU Notice Sentinel" <${user}>`,to,subject,text,html});}
