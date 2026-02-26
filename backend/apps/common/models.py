from django.db import models


class TimeStampedModel(models.Model):
    """Abstract base model with created/updated timestamps."""
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True


class CrimeSeverity(models.IntegerChoices):
    """Crime severity levels as defined in the spec."""
    
    LEVEL_3 = 3, "Level 3 - Minor (petty theft, minor fraud)"
    LEVEL_2 = 2, "Level 2 - Major (car theft)"
    LEVEL_1 = 1, "Level 1 - Severe (murder)"
    CRITICAL = 0, "Critical (serial murder, terrorism)"
