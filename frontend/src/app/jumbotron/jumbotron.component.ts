import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-jumbotron',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './jumbotron.component.html',
  styleUrl: './jumbotron.component.scss'
})
export class JumbotronComponent {
  @Input() selectedImage: string = '';
}
