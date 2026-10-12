"use strict";
const form=document.querySelector("#reset-form");
const status=document.querySelector("#status");
const message=document.querySelector("#message");
const submit=document.querySelector("#submit");
const password=document.querySelector("#password");
const confirmPassword=document.querySelector("#confirm-password");
let accessToken=null;

function showStatus(text){status.textContent=text;status.hidden=false;}
function readRecoveryToken(){
  const hash=new URLSearchParams(location.hash.replace(/^#/,""));
  const access=hash.get("access_token");
  const type=hash.get("type");
  const error=hash.get("error_description")||hash.get("error");
  if(error) throw new Error(decodeURIComponent(error.replace(/\+/g," ")));
  if(type!=="recovery"||!access) throw new Error("This reset link is missing or invalid. Request a fresh password-reset email.");
  return access;
}
(async()=>{
  try{
    accessToken=readRecoveryToken();
    history.replaceState(null,"",location.pathname+location.search);
    form.hidden=false;
    status.hidden=true;
  }catch(error){
    showStatus(error.message||"This reset link is invalid or expired. Request a fresh password-reset email.");
  }
})();
form.addEventListener("submit",async event=>{
  event.preventDefault();
  message.textContent="";
  if(password.value.length<10){message.textContent="Use at least 10 characters for your new password.";return;}
  if(password.value!==confirmPassword.value){message.textContent="The passwords do not match.";return;}
  submit.disabled=true;submit.textContent="Updating password…";
  try{
    const response=await fetch("https://pyzhhaqanyojysquynwg.supabase.co/auth/v1/user",{
      method:"PUT",
      headers:{"apikey":window.SUPABASE_PUBLISHABLE_KEY||"", "Authorization":"Bearer "+accessToken,"Content-Type":"application/json"},
      body:JSON.stringify({password:password.value})
    });
    const data=await response.json().catch(()=>({}));
    if(!response.ok) throw new Error(data.msg||data.message||data.error_description||"Could not update the password. Request a new reset email and try again.");
    showStatus("Your password has been updated. Redirecting to admin login…");
    form.hidden=true;
    setTimeout(()=>location.replace("/admin/login"),1200);
  }catch(error){message.textContent=error.message||"Password reset failed. Request a fresh email and try again.";}
  finally{submit.disabled=false;submit.textContent="Update password";}
});
