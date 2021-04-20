import { Observable } from 'rxjs';
import { Service } from '../core';

export abstract class Database extends Service {
    public abstract query(statement: string, parameters: any): Observable<any>;
}
