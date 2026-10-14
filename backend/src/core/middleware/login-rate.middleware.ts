import {Request,Response,NextFunction} from 'express';
import {redisService} from '../database/redis';
import {sendError} from '../utils/response.util';
import {auditService} from '../services/audit.service';
export async function loginRate(req:Request,res:Response,next:NextFunction){
  try{
    const count=await redisService.recordFailedLoginAttempt('ip:'+req.ip,600);
    if(count>60){res.setHeader('Retry-After','600');
      void auditService.log({req,action:'LOGIN_IP_RATE_LIMIT',entityName:'Security',entityId:'LOGIN',details:{count}});
      sendError(res,429,'Quá nhiều yêu cầu đăng nhập từ địa chỉ này; thử lại sau 10 phút');return;
    }next();
  }catch(e){next(e);}
}
