import { timingSafeEqual } from "node:crypto";
const URL_BASE=process.env.SUPABASE_URL;
const ANON=process.env.SUPABASE_ANON_KEY;
const SECRET=process.env.SUPABASE_SECRET_KEY;
const COOKIE="tc_admin_session";
function json(res,status,data){res.status(status).json(data)}
function admins(){return (process.env.ADMIN_EMAILS||"").split(",").map(x=>x.trim().toLowerCase()).filter(Boolean)}
function cookieValue(req){const raw=req.headers.cookie||"";for(const item of raw.split(";")){const i=item.trim().indexOf("=");if(i>0&&item.slice(0,i)===COOKIE)return decodeURIComponent(item.slice(i+1))}return null}
function setCookie(res,value,maxAge){res.setHeader("Set-Cookie",COOKIE+"="+encodeURIComponent(value)+"; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age="+maxAge)}
function validOrigin(req){const origin=req.headers.origin;if(!origin)return true;try{return new URL(origin).host===req.headers.host}catch{return false}}
async function userFor(token){const r=await fetch(URL_BASE+"/auth/v1/user",{headers:{apikey:ANON,Authorization:"Bearer "+token}});if(!r.ok)return null;return r.json()}
async function authorized(token){if(!token||!URL_BASE||!ANON)return null;const u=await userFor(token);if(!u?.email||!admins().includes(u.email.toLowerCase()))return null;return u}
export default async function handler(req,res){res.setHeader("Cache-Control","no-store");if(!validOrigin(req))return json(res,403,{error:"Forbidden."});if(!URL_BASE||!ANON)return json(res,503,{error:"Admin authentication is not configured."});if(req.method==="GET"){try{const u=await authorized(cookieValue(req));if(!u)return json(res,401,{error:"Authentication required."});return json(res,200,{authenticated:true,email:u.email})}catch{return json(res,401,{error:"Authentication required."})}}if(req.method!=="POST"){res.setHeader("Allow","GET, POST");return json(res,405,{error:"Method not allowed."})}let body=req.body;if(typeof body==="string"){try{body=JSON.parse(body)}catch{return json(res,400,{error:"Invalid request."})}}if(body?.action==="logout"){setCookie(res,"",0);return json(res,200,{success:true})}
if(body?.action==="request-reset"){
  const email=String(body.email||"").trim().toLowerCase();
  if(!email||!admins().includes(email))return json(res,200,{success:true,message:"If this email is authorized, a reset email will be sent."});
  const redirectTo=process.env.ADMIN_RESET_REDIRECT_URL||"https://transformationcamp.com.ng/reset-password";
  try{
    const r=await fetch(URL_BASE+"/auth/v1/recover?redirect_to="+encodeURIComponent(redirectTo),{method:"POST",headers:{apikey:ANON,"Content-Type":"application/json"},body:JSON.stringify({email})});
    if(!r.ok)return json(res,502,{error:"Could not request a reset email. Please try again later."});
    return json(res,200,{success:true,message:"If this email is authorized, a reset email will be sent."});
  }catch{return json(res,503,{error:"Authentication service is temporarily unavailable."})}
}
if(body?.action==="update-password"){
  const token=String(body.accessToken||""),password=String(body.password||"");
  if(!token||password.length<10||password.length>128)return json(res,400,{error:"A valid reset session and password of at least 10 characters are required."});
  try{
    const u=await authorized(token);
    if(!u)return json(res,401,{error:"The reset link is invalid or expired. Request a fresh reset email."});
    const r=await fetch(URL_BASE+"/auth/v1/user",{method:"PUT",headers:{apikey:ANON,Authorization:"Bearer "+token,"Content-Type":"application/json"},body:JSON.stringify({password})});
    const data=await r.json().catch(()=>({}));
    if(!r.ok)return json(res,400,{error:data.msg||data.message||"Could not update the password. Request a fresh reset email."});
    return json(res,200,{success:true});
  }catch{return json(res,503,{error:"Authentication service is temporarily unavailable."})}
}
if(body?.action!=="login")return json(res,400,{error:"Invalid action."});const email=String(body.email||"").trim().toLowerCase(),password=String(body.password||"");if(!email||!password||password.length>1024)return json(res,400,{error:"Email and password are required."});if(!admins().includes(email))return json(res,403,{error:"This account is not authorized for administration."});try{const r=await fetch(URL_BASE+"/auth/v1/token?grant_type=password",{method:"POST",headers:{apikey:ANON,"Content-Type":"application/json"},body:JSON.stringify({email,password})});const data=await r.json().catch(()=>({}));if(!r.ok||!data.access_token)return json(res,401,{error:"Invalid email or password."});const u=await userFor(data.access_token);if(!u?.email||!admins().includes(u.email.toLowerCase()))return json(res,403,{error:"This account is not authorized for administration."});setCookie(res,data.access_token,Math.min(Number(data.expires_in)||3600,3600));return json(res,200,{success:true})}catch{return json(res,503,{error:"Authentication service is temporarily unavailable."})}}