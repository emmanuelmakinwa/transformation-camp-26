"use strict";
const form=document.querySelector("#login-form"),message=document.querySelector("#message"),submit=document.querySelector("#submit"),forgot=document.querySelector("#forgot-password");
(async()=>{try{const r=await fetch("/api/admin-auth",{method:"GET",credentials:"same-origin"});if(r.ok)location.replace("/admin/")}catch{}})();
forgot.addEventListener("click",async()=>{
  message.textContent="";
  const email=form.email.value.trim();
  if(!email){message.textContent="Enter your administrator email address first.";form.email.focus();return;}
  forgot.disabled=true;forgot.textContent="Sending reset email…";
  try{
    const r=await fetch("/api/admin-auth",{method:"POST",credentials:"same-origin",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"request-reset",email})});
    const data=await r.json().catch(()=>({}));
    if(!r.ok)throw new Error(data.error||"Could not request a reset email.");
    message.textContent=data.message||"If this email is authorized, a reset email will be sent.";
  }catch(err){message.textContent=err.message||"Could not request a reset email.";}
  finally{forgot.disabled=false;forgot.textContent="Send password reset email";}
});
form.addEventListener("submit",async e=>{e.preventDefault();message.textContent="";submit.disabled=true;submit.textContent="Signing in…";try{const r=await fetch("/api/admin-auth",{method:"POST",credentials:"same-origin",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"login",email:form.email.value.trim(),password:form.password.value})});const data=await r.json().catch(()=>({}));if(!r.ok)throw new Error(data.error||"Sign-in failed. Check your details or administrator access.");location.replace("/admin/")}catch(err){message.textContent=err.message||"Unable to sign in. Please try again."}finally{submit.disabled=false;submit.textContent="Sign in securely"}});