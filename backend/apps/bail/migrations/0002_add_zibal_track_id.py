# Generated manually for Zibal IPG integration

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("bail", "0001_initial"),
    ]

    operations = [
        migrations.AddField(
            model_name="bail",
            name="zibal_track_id",
            field=models.BigIntegerField(
                blank=True,
                help_text="Zibal payment session trackId",
                null=True,
            ),
        ),
    ]
