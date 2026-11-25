import { IsArray, IsOptional, IsString } from 'class-validator';

export class ForecastBatchDto {
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  itemCodes?: string[];
}
