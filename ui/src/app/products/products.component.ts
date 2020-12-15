import { HttpClient } from '@angular/common/http';
import { Component, ViewChild, AfterViewInit } from '@angular/core';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { merge, Observable, of as observableOf } from 'rxjs';
import { catchError, map, startWith, switchMap } from 'rxjs/operators';

/**
 * @title Table retrieving data through HTTP
 */

@Component({
  selector: 'app-products',
  templateUrl: './products.component.html',
  styleUrls: ['./products.component.scss']
})
export class ProductsComponent implements AfterViewInit {
  displayedColumns: string[] = ['id', 'title'];
  exampleDatabase!: ExampleHttpDatabase | null;
  data: Product[] = [];
  size: number[] = [5, 10, 15, 20];

  resultsLength = 0;
  isLoadingResults = true;
  isRateLimitReached = false;

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  constructor(private _httpClient: HttpClient) { }

  ngAfterViewInit(query?: string) {
    this.exampleDatabase = new ExampleHttpDatabase(this._httpClient);

    // If the user changes the sort order, reset back to the first page.
    this.sort.sortChange.subscribe(() => this.paginator.pageIndex = 0);

    merge(this.sort.sortChange, this.paginator.page)
      .pipe(
        startWith({}),
        switchMap(() => {
          this.isLoadingResults = true;
          return this.exampleDatabase!.getProducts(
            this.sort.active, this.sort.direction, this.paginator.pageIndex, query ? query : '', this.paginator.pageSize);
        }),
        map(data => {
          // Flip flag to show that loading has finished.
          this.isLoadingResults = false;
          this.isRateLimitReached = false;
          this.resultsLength = data.hits;

          return data.products;
        }),
        catchError(() => {
          this.isLoadingResults = false;
          // Catch if the GitHub API has reached its rate limit. Return empty data.
          this.isRateLimitReached = true;
          return observableOf([]);
        })
      ).subscribe(data => this.data = data);
  }

  applyFilter(event: Event) {
    const filterValue = (event.target as HTMLInputElement).value;
    const query = filterValue.trim().toLowerCase();
    this.ngAfterViewInit(query);

    if (this.paginator) {
      this.paginator.firstPage();
    }
  }
}

export interface Products {
  products: Product[];
  hits: number;
}

export interface Product {
  id: string;
  title: string;
}

/** An example database that the data source uses to retrieve data for the table. */
export class ExampleHttpDatabase {
  constructor(private _httpClient: HttpClient) { }

  getProducts(sort: string, order: string, page: number, query: string, size: number): Observable<Products> {
    const href = 'http://localhost:8080/api/v1/alchersan/products';
    const requestUrl =
      `${href}?size=${size}&page=${page}&order=${order}&sort=${sort}&q=${query}`;

    return this._httpClient.get<Products>(requestUrl);
  }
}