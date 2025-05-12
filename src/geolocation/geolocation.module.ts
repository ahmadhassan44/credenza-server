import { Module } from '@nestjs/common';
import e from 'express';
import { GeolocationService } from './geolocation.service';

@Module({ exports: [GeolocationService], providers: [GeolocationService] })
export class GeolocationModule {}
