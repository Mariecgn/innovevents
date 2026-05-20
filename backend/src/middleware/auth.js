const jwt=require('jsonwebtoken');
function auth(req,res,next){const h=req.headers.authorization||'';const token=h.startsWith('Bearer ')?h.slice(7):null;if(!token)return res.status(401).json({message:'Authentification requise'});try{req.user=jwt.verify(token,process.env.JWT_SECRET||'change-me');next();}catch(e){res.status(401).json({message:'Token invalide'});}}
function allow(...roles){return (req,res,next)=>{if(!req.user||!roles.includes(req.user.role))return res.status(403).json({message:'Accès refusé'});next();}}
module.exports={auth,allow};
