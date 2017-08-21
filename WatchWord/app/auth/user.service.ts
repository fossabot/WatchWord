﻿import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ReplaySubject } from 'rxjs/ReplaySubject';
import { UserModel } from './auth.models';

@Injectable()
export class UserService {
    private userModelSubject: ReplaySubject<UserModel> = new ReplaySubject<UserModel>(1);

    constructor() { }

    public initializeUser() {
        var currentUserStorage = localStorage.getItem('currentUser');
        if (currentUserStorage) {
            this.userModelSubject.next(JSON.parse(currentUserStorage));
        } else {
            var userModel: UserModel = new UserModel('', false);
            this.setUser(userModel);
        }
    }

    public setUser(user: UserModel) {
        this.userModelSubject.next(user);
        localStorage.setItem('currentUser', JSON.stringify(user));
    }

    public getUserObservable(): Observable<UserModel> {
        return this.userModelSubject.asObservable();
    }
}